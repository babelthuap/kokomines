import {ioLocal} from './localserver.js';
import {getIdEl} from './util.js';

const EL = getIdEl(document);
EL.boom = createDiv('boom');
EL.winner = createDiv('winner');

let state = null;

let multiplayerState = null;
EL.multiplayer.addEventListener('click', () => {
  if (multiplayerState === null) {
    state = multiplayerState = initState(window.io, prompt('Username'));
  } else {
    state = multiplayerState;
    state.socket.emit('init');
  }
  document.body.classList.add('play');
});

let singleplayerState = null;
EL.singleplayer.addEventListener('click', () => {
  if (singleplayerState === null) {
    state = singleplayerState = initState(ioLocal);
  } else {
    state = singleplayerState;
    state.socket.emit('init');
  }
  document.body.classList.add('play');
});

EL.howToPlay.addEventListener('click', () => {
  EL.instructions.style.display = EL.instructions.style.display ? '' : 'none';
});

EL.returnToMenu.addEventListener('click', () => {
  document.body.classList.remove('play');
});

function initState(socketProvider, username) {
  const state = {
    socket: socketProvider(),
    gameInProgress: false,
    restarting: true,
    width: 0,
    hoverIndices: new Set(),
  };
  state.socket.on('init', handleSocketInit.bind(state));
  state.socket.on('update', handleUpdate.bind(state));
  state.socket.on('hover', handleHover.bind(state));
  state.socket.on('usernames', handleUsernames.bind(state));
  state.username =
      (username || state.socket.id).trim().replace(/,/g, '').slice(0, 16);
  state.socket.emit('init', state.username);
  return state;
}

function handleSocketInit(serverState) {
  console.log('socket.id:', this.socket.id);
  this.restarting = true;
  window.requestAnimationFrame(() => {
    const board = serverState.board;
    EL.board.innerHTML = '';
    EL.numFlags.innerText = board.flags;
    EL.numMines.innerText = board.mines;
    [EL.board, EL.inputs, EL.counters].forEach(el => el.classList.remove('shake'));

    this.width = board.width;
    for (let row = 0; row < board.height; row++) {
      const rowDiv = createDiv('row');
      for (let i = row * this.width; i < (row + 1) * this.width; i++) {
        const [revealed, label] = board.tiles[i];
        const tileDiv = createDiv('tile');
        if (!revealed) {
          tileDiv.classList.add('concealed');
        }
        if (label) {
          switch (label) {
            case 'F':
              tileDiv.classList.add('flag');
              break;
            case 'M':
              tileDiv.classList.add('mine');
              break;
            default:
              tileDiv.innerText = label;
              if (typeof label === 'number') {
                tileDiv.classList.add(`m${label}`);
              }
          }
        }
        tileDiv.i = i;
        rowDiv.appendChild(tileDiv);
      }
      EL.board.appendChild(rowDiv);
    }
    EL.controls.style.width = `${EL.board.scrollWidth}px`;
    EL.players.style.width = `${EL.board.scrollWidth}px`;

    this.gameInProgress = serverState.gameInProgress;
    EL.restart.style.visibility = this.gameInProgress ? 'hidden' : '';
    window.requestAnimationFrame(() => this.restarting = false);
  });
}

function handleUpdate(update) {
  if ('gameWon' in update) {
    this.gameInProgress = false;
    window.requestAnimationFrame(() => {
      if (update.gameWon) {
        EL.board.appendChild(EL.winner);
        fireworks();
      } else {
        EL.board.appendChild(EL.boom);
        [EL.board, EL.inputs, EL.counters].forEach(el => el.classList.add('shake'));
      }
      EL.restart.style.visibility = '';
    });
  }
  if ('flags' in update) {
    window.requestAnimationFrame(() => {
      EL.numFlags.innerText = update.flags;
    });
  }
  if ('tiles' in update) {
    updateTiles(update.tiles);
  }
}

async function updateTiles(tiles) {
  for (let equidistantTiles of tiles) {
    if (state.restarting) {
      return;
    }
    await updateEquidistantTiles(equidistantTiles);
  }
}

function updateEquidistantTiles(equidistantTiles) {
  return new Promise((resolve) => window.requestAnimationFrame(() => {
    for (let [i, tile] of equidistantTiles) {
      const tileDiv = getTileDiv(i);
      const [revealed, label] = tile;
      if (revealed) {
        tileDiv.classList.remove('concealed');
      } else {
        tileDiv.classList.add('concealed');
      }
      switch (label) {
        case 'F':
          tileDiv.classList.add('flag');
          break;
        case 'M':
          tileDiv.classList.add('mine');
          break;
        default:
          tileDiv.classList.remove('flag');
          tileDiv.innerText = label || '';
          if (typeof label === 'number') {
            tileDiv.classList.add(`m${label}`);
          }
      }
    }
    resolve();
  }));
}

function handleHover(hovering) {
  let newHoverIndices = new Set();
  for (let id in hovering) {
    if (id !== this.socket.id) {
      newHoverIndices.add(hovering[id]);
    }
  }
  for (let i of newHoverIndices) {
    if (this.hoverIndices.has(i)) {
      this.hoverIndices.delete(i);
    } else {
      getTileDiv(i).classList.add('other');
    }
  }
  for (let i of this.hoverIndices) {
    getTileDiv(i).classList.remove('other');
  }
  this.hoverIndices = newHoverIndices;
}

function handleUsernames(usernames) {
  console.log(usernames);
  const arr = [];
  for (let id in usernames) {
    const name =
        (id === this.socket.id) ? (usernames[id] + ' (you)') : usernames[id];
    arr.push(name);
  }
  EL.players.innerText = `PLAYERS: ${arr.sort().join(', ')}`;
}

EL.board.addEventListener('mouseover', (e) => {
  if ('i' in e.target) {
    state.socket.emit('hover', e.target.i);
  }
});

EL.restart.addEventListener('click', triggerRestart);

function triggerRestart() {
  if (!state.gameInProgress && !state.restarting) {
    state.restarting = true;
    state.socket.emit('restart');
    window.requestAnimationFrame(
        () => EL.restart.style.visibility = 'hidden');
  }
}

let canRightClick = false;
EL.board.addEventListener('mousedown', (e) => {
  if (state.gameInProgress && e.target.classList.contains('concealed')) {
    const rightClick = e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey;
    const hasFlag = e.target.classList.contains('flag');
    // Optimistic updates
    if (rightClick) {
      // Right click
      canRightClick = true;
      if (hasFlag) {
        e.target.classList.remove('flag');
      } else {
        e.target.classList.add('flag');
      }
    } else {
      // Left click
      if (hasFlag) {
        // Tried to reveal a flagged tile
        return;
      } else {
        e.target.classList.remove('concealed');
      }
    }
    state.socket.emit('click', [e.target.i, rightClick]);
  } else if (
      e.target.classList.contains('boom') ||
      e.target.classList.contains('winner')) {
    triggerRestart();
  }
  e.stopPropagation();
  return false;
});

EL.board.addEventListener('contextmenu', (e) => {
  if (!canRightClick && state.gameInProgress &&
      e.target.classList.contains('concealed')) {
    // Simulate right-click on mobile
    state.socket.emit('click', [e.target.i, /* rightClick= */ true]);
  }
  e.preventDefault();
  return false;
});

EL.rockRaiders.addEventListener('change', (e) => {
  if (e.target.checked) {
    document.body.classList.add('rock-raiders');
    localStorage.setItem('rockRaidersGraphics', true);
  } else {
    document.body.classList.remove('rock-raiders');
    localStorage.removeItem('rockRaidersGraphics');
  }
});

if (localStorage.rockRaidersGraphics) {
  EL.rockRaiders.checked = true;
}

function getTileDiv(i) {
  const x = i % state.width;
  const y = (i - x) / state.width;
  return EL.board.children[y].children[x];
}

// Creates a div with the given class
function createDiv(className) {
  const div = document.createElement('div');
  div.classList.add(className);
  return div;
}

// Yay!
function fireworks() {
  const pyro = createDiv('pyro');
  const before = createDiv('before');
  const after = createDiv('after');
  pyro.appendChild(before);
  pyro.appendChild(after);
  EL.board.appendChild(pyro);
}

(() => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'fireworks.css';
  document.head.appendChild(link);
})();
