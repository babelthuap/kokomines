'use strict';

const PORT = (parseInt(process.env.PORT) && parseInt(process.env.PORT)) ||
    (parseInt(process.argv[2]) && parseInt(process.argv[2])) || 5000;

// External modules
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require('socket.io');
const io = new Server(server);

// My modules
const {getPublicState, restart, handleClick} = require('./minesweeper.js');
const {log, time} = require('./logger.js');

// Initialize app
app.use(express.static('client'));
io.on('connection', handleConnection);
server.listen(PORT, handleServerStartup);

// Handles communication with a socket
const hovering = {};
const recentlyClicked = new Map();
function handleConnection(socket) {
  log(`user ${socket.id} connected`);

  socket.emit('init', getPublicState());

  socket.on('hover', (i) => {
    if (i !== null) {
      hovering[socket.id] = i;
    } else {
      delete hovering[socket.id];
    }
    socket.broadcast.emit('hover', hovering);
  });

  socket.on('click', ([i, rightClick]) => {
    const state = getPublicState();
    if (state.gameInProgress) {
      // Avoid conflicting clicks from different clients
      const clicked = recentlyClicked.get(i);
      if (clicked) {
        if (clicked.socketId !== socket.id) {
          // Notify this client that the update failed
          return socket.emit('update', {tiles: [[[i, state.board.tiles[i]]]]});
        } else {
          clearTimeout(clicked.timeoutId);
        }
      }
      recentlyClicked.set(i, {
        socketId: socket.id,
        timeoutId: setTimeout(() => recentlyClicked.delete(i), 500),
      });

      // Handle the darn click
      time('handleClick', () => {
        const update = handleClick(i, rightClick);
        if (update) {
          io.emit('update', update);
        }
      });
    }
  });

  socket.on('restart', () => restart() && io.emit('init', getPublicState()));

  socket.on('disconnect', () => {
    log(`user ${socket.id} disconnected`);
    delete hovering[socket.id];
    socket.broadcast.emit('hover', hovering);
  });
}

// Displays logs on server startup
function handleServerStartup() {
  const networkInterfaces = require('os').networkInterfaces();
  const primaryInterface = Object.values(networkInterfaces)
                               .flatMap(i => i)
                               .find(i => i.family === 'IPv4' && !i.internal);
  if (primaryInterface) {
    console.log(`listening on ${primaryInterface.address}:${PORT}`);
  } else {
    log('WARNING: No external IPv4 network interface in', networkInterfaces);
    console.log(`listening on port ${PORT}`);
  }
}
