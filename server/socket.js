import {getPublicState, restart, handleClick} from '../client/minesweeper.js';
import {log, time} from './logger.js';

// Handles communication with a socket
export function handleConnection(socket, io) {
  log(`user ${socket.id} connected`);
  socket.on('init', (username) => handleInit(username, socket, io))
      .on('click', (data) => handleClickEvent(data, socket, io))
      .on('hover', (i) => handleHover(i, socket))
      .on('restart', () => restart() && io.emit('init', getPublicState()))
      .on('disconnect', () => handleDisconnect(socket));
}

const usernames = {};
function handleInit(username, socket, io) {
  socket.emit('init', getPublicState());
  if (username) {
    usernames[socket.id] = username.trim().replace(/,/g, '').slice(0, 16);
    io.emit('usernames', usernames);
  }
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
  delete usernames[socket.id];
  delete hovering[socket.id];
  socket.broadcast.emit('usernames', usernames);
  socket.broadcast.emit('hover', hovering);
}
