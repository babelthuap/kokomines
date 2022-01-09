import {getPublicState, handleClick, restart} from './minesweeper.js';

// Local adapter for socket.io
export function ioLocal() {
  const socket = {id: Math.random().toString().slice(2)};
  const callbacks = {};

  socket.on = (event, fn) => {
    callbacks[event] = fn;
  };

  socket.emit = (event, data) => {
    switch (event) {
      case 'init':
        callbacks.init(getPublicState());
        break;
      case 'click':
        callbacks.update(handleClick(...data));
        break;
      case 'restart':
        restart();
        callbacks.init(getPublicState());
        break;
    }
  };

  return socket;
}
