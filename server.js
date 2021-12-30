'use strict';

const PORT = (parseInt(process.argv[2]) && parseInt(process.argv[2])) || 80;

// External modules
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require('socket.io');
const io = new Server(server);

// My modules
const {state, restart, handleClick} = require('./js/minesweeper.js');
const {log, time} = require('./js/logger.js');

// Initialize app
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));
app.use(express.static('public'));
io.on('connection', handleConnection);
server.listen(PORT, handleServerStartup);

// Handles communication with a socket
const hovering = {};
function handleConnection(socket) {
  log(`user ${socket.id} connected`);

  socket.emit('init', {
    gameInProgress: state.gameInProgress,
    board: state.board,
  });

  socket.on('hover', (i) => {
    if (i !== null) {
      hovering[socket.id] = i;
    } else {
      delete hovering[socket.id];
    }
    socket.broadcast.emit('hover', hovering);
  });

  socket.on('click', ([i, button]) => {
    if (state.gameInProgress) {
      time('handleClick', () => {
        const update = handleClick(i, button);
        if (update) {
          io.emit('update', update);
        }
      });
    }
  });

  socket.on('restart', () => restart() && io.emit('init', {
    gameInProgress: state.gameInProgress,
    board: state.board,
  }));

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
