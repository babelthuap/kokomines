'use strict';

const {getPublicState, restart, handleClick} = require('./minesweeper.js');
const {log, time} = require('./logger.js');

// Handles communication with a socket
function handleConnection(socket, io) {
  log(`user ${socket.id} connected`);
  socket.emit('init', getPublicState());
  socket
      .on('init', () => socket.emit('init', getPublicState()))
      .on('click', (data) => handleClickEvent(data, socket, io))
      .on('hover', (i) => handleHover(i, socket))
      .on('restart', () => restart() && io.emit('init', getPublicState()))
      .on('disconnect', () => handleDisconnect(socket));
}

const recentlyClicked = new Map();
function handleClickEvent([i, rightClick], socket, io) {
  const state = getPublicState();
  if (!state.gameInProgress) {
    return;
  }
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

const hovering = {};
function handleHover(i, socket) {
  if (i !== null) {
    hovering[socket.id] = i;
  } else {
    delete hovering[socket.id];
  }
  socket.broadcast.emit('hover', hovering);
}

function handleDisconnect(socket) {
  log(`user ${socket.id} disconnected`);
  delete hovering[socket.id];
  socket.broadcast.emit('hover', hovering);
}

exports.handleConnection = handleConnection;
