const BOARD_EL = document.getElementById('board');
const BOOM = createDiv('boom');
BOOM.innerText = 'BOOM';
const CONTROLS = document.getElementById('controls');
const COUNTERS = document.getElementById('counters');
const FLAGS_EL = document.getElementById('numFlags');
const HOW_TO_PLAY = document.getElementById('how-to-play');
const INPUTS = document.getElementById('inputs');
const INSTRUCTIONS = document.getElementById('instructions');
const MINES_EL = document.getElementById('numMines');
const MULTIPLAYER = document.getElementById('multiplayer');
const RESTART_BUTTON = document.getElementById('restart');
const RETURN_TO_MENU = document.getElementById('return-to-menu');
const ROCK_RAIDERS = document.getElementById('rock-raiders');
const SINGLEPLAYER = document.getElementById('singleplayer');
const WINNER = createDiv('winner');
WINNER.innerText = 'WINNER';

const socket = io();

let gameInProgress = false;
let restarting = true;
let width = 0;

socket.on('init', (serverState) => {
  console.log('socket.id:', socket.id);
  restarting = true;
  window.requestAnimationFrame(() => {
    const board = serverState.board;
    BOARD_EL.innerHTML = '';
    FLAGS_EL.innerText = board.flags;
    MINES_EL.innerText = board.mines;
    [BOARD_EL, INPUTS, COUNTERS].forEach(el => el.classList.remove('shake'));

    width = board.width;
    for (let row = 0; row < board.height; row++) {
      const rowDiv = createDiv('row');
      for (let i = row * width; i < (row + 1) * width; i++) {
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
      BOARD_EL.appendChild(rowDiv);
    }
    CONTROLS.style.width = `${BOARD_EL.scrollWidth}px`;

    gameInProgress = serverState.gameInProgress;
    RESTART_BUTTON.style.visibility = gameInProgress ? 'hidden' : '';
    window.requestAnimationFrame(() => restarting = false);
  });
});

socket.on('update', (update) => {
  if ('gameWon' in update) {
    gameInProgress = false;
    window.requestAnimationFrame(() => {
      if (update.gameWon) {
        BOARD_EL.appendChild(WINNER);
        fireworks();
      } else {
        BOARD_EL.appendChild(BOOM);
        [BOARD_EL, INPUTS, COUNTERS].forEach(el => el.classList.add('shake'));
      }
      RESTART_BUTTON.style.visibility = '';
    });
  }
  if ('flags' in update) {
    window.requestAnimationFrame(() => {
      FLAGS_EL.innerText = update.flags;
    });
  }
  if ('tiles' in update) {
    updateTiles(update.tiles);
  }
});

async function updateTiles(tiles) {
  for (let equidistantTiles of tiles) {
    if (restarting) {
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

let hoverIndices = new Set();
socket.on('hover', (hovering) => {
  let newHoverIndices = new Set();
  for (let id in hovering) {
    if (id !== socket.id) {
      newHoverIndices.add(hovering[id]);
    }
  }
  for (let i of newHoverIndices) {
    if (hoverIndices.has(i)) {
      hoverIndices.delete(i);
    } else {
      getTileDiv(i).classList.add('other');
    }
  }
  for (let i of hoverIndices) {
    getTileDiv(i).classList.remove('other');
  }
  hoverIndices = newHoverIndices;
});

BOARD_EL.addEventListener('mouseover', (e) => {
  if ('i' in e.target) {
    socket.emit('hover', e.target.i);
  }
});

RESTART_BUTTON.addEventListener('click', () => {
  if (!gameInProgress && !restarting) {
    restarting = true;
    socket.emit('restart');
    window.requestAnimationFrame(
        () => RESTART_BUTTON.style.visibility = 'hidden');
  }
});

BOARD_EL.addEventListener('mousedown', (e) => {
  if (gameInProgress && e.target.classList.contains('concealed')) {
    const rightClick = e.button !== 0 || e.altKey || e.ctrlKey || e.metaKey;
    const hasFlag = e.target.classList.contains('flag');
    // Optimistic updates
    if (rightClick) {
      // Right click
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
    socket.emit('click', [e.target.i, rightClick]);
  }
  e.stopPropagation();
  return false;
});

BOARD_EL.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
});

HOW_TO_PLAY.addEventListener('click', () => {
  INSTRUCTIONS.style.display = INSTRUCTIONS.style.display ? '' : 'none';
});

MULTIPLAYER.addEventListener('click', () => {
  document.body.classList.add('play');
  CONTROLS.style.width = `${BOARD_EL.scrollWidth}px`;
});

SINGLEPLAYER.addEventListener('click', () => {
  window.open('https://babelthuap.github.io/mines', '_blank');
});

RETURN_TO_MENU.addEventListener('click', () => {
  document.body.classList.remove('play');
});

ROCK_RAIDERS.addEventListener('change', (e) => {
  if (e.target.checked) {
    document.body.classList.add('rock-raiders');
    localStorage.setItem('rockRaidersGraphics', true);
  } else {
    document.body.classList.remove('rock-raiders');
    localStorage.removeItem('rockRaidersGraphics');
  }
});

if (localStorage.rockRaidersGraphics) {
  ROCK_RAIDERS.checked = true;
}

function getTileDiv(i) {
  const x = i % width;
  const y = (i - x) / width;
  return BOARD_EL.children[y].children[x];
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
  BOARD_EL.appendChild(pyro);
}

(() => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'fireworks.css';
  document.head.appendChild(link);
})();
