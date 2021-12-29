'use strict';

const PORT = process.argv[2] || 80;
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

const hovering = {};
function handleConnection(socket) {
  console.log(`user ${socket.id} connected`);

  socket.emit('init', state.board);

  socket.on('hover', (i) => {
    if (i !== null) {
      hovering[socket.id] = i;
    } else {
      delete hovering[socket.id];
    }
    socket.broadcast.emit('hover', hovering);
  });

  socket.on('click', ([i, button]) => {
    if (gameInProgress) {
      const update = handleClick(i, button);
      if (update) {
        io.emit('update', update);
      }
    }
  });

  socket.on('restart', restart);

  socket.on('disconnect', () => {
    console.log(`user ${socket.id} disconnected`);
    delete hovering[socket.id];
    socket.broadcast.emit('hover', hovering);
  });
}

function restart() {
  if (!gameInProgress && !restarting) {
    restarting = true;
    initGameState();
    gameInProgress = true;
    io.emit('init', state.board);
    setTimeout(() => restarting = false, 1000);
  }
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
  // Clear all surrounding tiles on the first click
  if (state.firstClick) {
    state.firstClick = false;
    clearMines(i);
  }
  // Go boom?
  if (state.minePositions[i]) {
    const tile = state.board.tiles[i];
    tile[0] = true;
    tile[1] = '💣';
    gameInProgress = false;
    return {gameWon: false, tiles: [[[i, tile]]]};
  }
  // Reveal a non-bomb tile
  const updatedIndices = descubrido(i);
  const indicesByDist = updatedIndices.reduce((map, j) => {
    const d = dist(i, j);
    (map[d] || (map[d] = [])).push(j);
    return map;
  }, {});
  const updatedTiles =
      Object.entries(indicesByDist)
          .sort(([d1], [d2]) => d1 - d2)
          .map(([d, indices]) => indices.map(i => [i, state.board.tiles[i]]));
  if (state.tilesLeftToReveal === 0) {
    gameInProgress = false;
    return {gameWon: true, flags: state.board.flags, tiles: updatedTiles};
  } else {
    return {flags: state.board.flags, tiles: updatedTiles};
  }
}

// Clears all surrounding tiles
function clearMines(i) {
  let minesToReplace = 0;
  const indicesToAvoid = new Set();
  indicesToAvoid.add(i);
  if (state.minePositions[i]) {
    state.minePositions[i] = false;
    minesToReplace++;
  }
  forEachNbrIndex(i, (nbr) => {
    indicesToAvoid.add(nbr);
    if (state.minePositions[nbr]) {
      state.minePositions[nbr] = false;
      minesToReplace++;
    }
  });
  while (minesToReplace > 0) {
    const r = rand(state.board.tiles.length - 1);
    if (!state.minePositions[r] && !indicesToAvoid.has(r)) {
      state.minePositions[r] = true;
      minesToReplace--;
    }
  }
  // Calculate adjacentMines
  for (let i = 0; i < state.board.tiles.length; i++) {
    if (state.minePositions[i]) {
      forEachNbrIndex(i, (nbr) => state.adjacentMines[nbr]++);
    }
  }
}

// A new cavern has been discovered?
function descubrido(i) {
  const updatedIndices = [];
  const queue = new ArrayQueue();
  queue.push(i);
  while (queue.size() > 0) {
    const j = queue.pop();
    const tile = state.board.tiles[j];

    if (tile[0 /* revealed */]) {
      continue;
    }
    tile[0 /* revealed */] = true;
    state.tilesLeftToReveal--;

    if (tile[1 /* label */]) {
      // Remove flag
      tile[1] = null;
      state.board.flags--;
    }
    const adjacentMines = state.adjacentMines[j];
    if (adjacentMines > 0) {
      tile[1 /* label */] = adjacentMines;
    }

    updatedIndices.push(j);
    if (adjacentMines === 0 && !state.minePositions[j]) {
      forEachNbrIndex(j, queue.push);
    }
  }
  return updatedIndices;
}

function dist(i, j) {
  const width = state.board.width;
  const ix = i % width;
  const iy = (i - ix) / width;
  const jx = j % width;
  const jy = (j - jx) / width;
  return (ix - jx) * (ix - jx) + (iy - jy) * (iy - jy);
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
  return {flags: state.board.flags, tiles: [[[i, tile]]]};
}

// Creates a new game state
function initGameState(width = 30, height = 16, density = 0.2) {
  state.firstClick = true;

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
}

// Executes a function for each neighboring tile index
function forEachNbrIndex(i, fn) {
  const width = state.board.width;
  const x = i % width;
  const y = (i - x) / width;

  let upExists = y > 0;
  let downExists = y < state.board.height - 1;
  let leftExists = x > 0;
  let rightExists = x < state.board.width - 1;

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

function ArrayQueue() {
  const array = [];
  let headIndex = 0;
  let size = 0;

  this.size = () => size;
  this.push = (value) => {
    size++;
    array.push(value);
  };
  this.pop = () => {
    if (size === 0) {
      return undefined;
    } else {
      size--;
      return array[headIndex++];
    }
  };
}
