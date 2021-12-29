const PORT = 8000;
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const {Server} = require('socket.io');
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.use(express.static('public'));

const state = {};
initGameState();
let gameInProgress = true;
let restarting = false;
io.on('connection', handleConnection);

server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});

function handleConnection(socket) {
  console.log(`user ${socket.id} connected!`);

  socket.emit('init', state.board);

  socket.on('click', ([i, button]) => {
    try {
      if (gameInProgress) {
        const update = handleClick(i, button);
        if (update) {
          io.emit('update', update);
        }
      }
    } catch (e) {
      console.log('ERROR:', e);
      restarting = true;
      initGameState();
      gameInProgress = true;
      io.emit('init', state.board);
      setTimeout(() => restarting = false, 1000);
    }
  });

  socket.on('restart', () => {
    if (!gameInProgress && !restarting) {
      restarting = true;
      initGameState();
      gameInProgress = true;
      io.emit('init', state.board);
      setTimeout(() => restarting = false, 1000);
    }
  });

  socket.on('disconnect', () => console.log(`user ${socket.id} disconnected`));
}

function handleClick(i, button) {
  const [revealed] = state.board.tiles[i];
  if (!revealed) {
    if (button === 0) {
      return reveal(i);
    } else {
      return flag(i);
    }
  }
}

// Reveals a tile
function reveal(i) {
  const tile = state.board.tiles[i];
  if (state.minePositions[i]) {
    // TODO: swap mine on first click
    tile[0] = true;
    tile[1] = '💣';
    gameInProgress = false;
    return {gameWon: false, tiles: {[i]: tile}};
  } else {
    const updatedIndices = [];
    aNewCavernHasBeenDiscovered(i, updatedIndices);
    const updatedTiles = updatedIndices.reduce((tiles, i) => {
      tiles[i] = state.board.tiles[i];
      return tiles;
    }, {});
    if (state.tilesLeftToReveal === 0) {
      gameInProgress = false;
      return {gameWon: true, flags: state.board.flags, tiles: updatedTiles};
    } else {
      return {flags: state.board.flags, tiles: updatedTiles};
    }
  }
}

// Recursively descubrido
function aNewCavernHasBeenDiscovered(i, updatedIndices) {
  const tile = state.board.tiles[i];
  if (tile[0]) {
    return;
  }

  tile[0] = true;
  if (tile[1]) {
    tile[1] = null;
    state.board.flags--;
  }
  const adjacentMines = state.adjacentMines[i];
  if (adjacentMines > 0) {
    tile[1] = adjacentMines;
  }
  state.tilesLeftToReveal--;

  updatedIndices.push(i);
  if (adjacentMines === 0 && !state.minePositions[i]) {
    forEachNbrIndex(
        i, (nbr) => aNewCavernHasBeenDiscovered(nbr, updatedIndices));
  }
}

// Toggles a flag
function flag(i) {
  const tile = state.board.tiles[i];
  const label = tile[1];
  if (label) {
    tile[1] = null;
    state.board.flags--;
  } else {
    tile[1] = 'F';
    state.board.flags++;
  }
  return {flags: state.board.flags, tiles: {[i]: tile}};
}

// Creates a new game state
function initGameState(width = 30, height = 16, density = 0.2) {
  const numTiles = width * height;
  const numMines = Math.round(numTiles * density);

  state.tilesLeftToReveal = numTiles - numMines;
  state.board = {
    width: width,
    height: height,
    mines: numMines,
    flags: 0,
    tiles: new Array(numTiles),
  };
  for (let i = 0; i < numTiles; i++) {
    state.board.tiles[i] = [false, null];  // [revealed, label]
  }

  state.minePositions = new Array(numTiles).fill(false);
  for (let i = 0; i < numMines; i++) {
    state.minePositions[i] = true;
  }
  shuffle(state.minePositions);

  state.adjacentMines = new Array(numTiles).fill(0);
  for (let i = 0; i < numTiles; i++) {
    if (state.minePositions[i]) {
      forEachNbrIndex(i, (nbr) => state.adjacentMines[nbr]++);
    }
  }
}

// Executes a function for each neighboring tile index
function forEachNbrIndex(i, fn) {
  const width = state.board.width;
  const x = i % width;
  const y = (i - x) / width;

  let upExists = y >= 0;
  let downExists = y < state.board.height;
  let leftExists = x >= 0;
  let rightExists = x < state.board.width;

  let rowOffset;
  // Row above
  if (upExists) {
    rowOffset = (y - 1) * width;
    leftExists && fn(x - 1 + rowOffset);
    fn(x + rowOffset);
    rightExists && fn(x + 1 + rowOffset);
  }
  // Current row
  rowOffset = y * width;
  leftExists && fn(x - 1 + rowOffset);
  rightExists && fn(x + 1 + rowOffset);
  // Row below
  if (downExists) {
    rowOffset = (y + 1) * width;
    leftExists && fn(x - 1 + rowOffset);
    fn(x + rowOffset);
    rightExists && fn(x + 1 + rowOffset);
  }
}

// Shuffles an array in place
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = rand(i);
    let temp = arr[j];
    arr[j] = arr[i];
    arr[i] = temp;
  }
  return arr;
}

// Gets random int in [0, n]
function rand(n) {
  return Math.floor((n + 1) * Math.random());
}
