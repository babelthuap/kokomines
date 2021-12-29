const BOARD_EL = document.getElementById('board');
const BOOM = createDiv('boom');
BOOM.innerText = 'BOOM';
const FLAGS_EL = document.getElementById('numFlags');
const MINES_EL = document.getElementById('numMines');
const RESTART_BUTTON = document.getElementById('restart');
const WINNER = createDiv('winner');
WINNER.innerText = 'WINNER';

const socket = io();

let gameInProgress = false;
let restarting = true;
let width = 0;

socket.on('init', (board) => {
  window.requestAnimationFrame(() => {
    BOARD_EL.innerHTML = '';
    FLAGS_EL.innerText = board.flags;
    MINES_EL.innerText = board.mines;

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
          tileDiv.innerText = label;
          if (typeof label === 'number') {
            tileDiv.classList.add(`m${label}`);
          }
        }
        tileDiv.i = i;
        rowDiv.appendChild(tileDiv);
      }
      BOARD_EL.appendChild(rowDiv);
    }

    gameInProgress = true;
    restarting = false;
  });
});

socket.on('update', (update) => {
  window.requestAnimationFrame(() => {
    if ('gameWon' in update) {
      gameInProgress = false;
      if (update.gameWon) {
        BOARD_EL.appendChild(WINNER);
      } else {
        BOARD_EL.appendChild(BOOM);
      }
      RESTART_BUTTON.style.visibility = '';
    }
    if ('flags' in update) {
      FLAGS_EL.innerText = update.flags;
    }
    if ('tiles' in update) {
      for (let i in update.tiles) {
        const tileDiv = getTileDiv(i);
        tileDiv.style.opacity = '';
        const [revealed, label] = update.tiles[i];
        if (revealed) {
          tileDiv.classList.remove('concealed');
        }
        tileDiv.innerText = label || '';
        if (typeof label === 'number') {
          tileDiv.classList.add(`m${label}`);
        } else if (label === '💣') {
          tileDiv.classList.add('mine');
        }
      }
    }
  });
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
  if (gameInProgress && e.target.classList.contains('concealed') &&
      !(e.button === 0 && e.target.innerText)) {
    e.target.style.opacity = '0.5';
    socket.emit('click', [e.target.i, e.button]);
  }
});

BOARD_EL.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
});

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
