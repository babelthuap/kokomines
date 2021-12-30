'use strict';

const {dist, shuffle, rand} = require('./util.js');
const {time} = require('./logger.js');

// First initialization
const state = {
  gameInProgress: false,
  restarting: false,
  firstClick: null,
  tilesLeftToReveal: null,
  board: null,
  minePositions: null,
  adjacentMines: null,
};
restart();

// Restarts the game if it's not currently in progress
function restart() {
  if (!state.gameInProgress && !state.restarting) {
    state.restarting = true;
    initGameState();
    state.gameInProgress = true;
    setTimeout(() => state.restarting = false, 1000);
    return true;
  } else {
    return false;
  }
}

// Handles a click on the given tile
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

// Initializes the game state
function initGameState(width = 30, height = 16, density = 0.2) {
  time('initGameState', () => {
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
  });
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
    state.gameInProgress = false;
    return {gameWon: false, tiles: [[[i, tile]]]};
  }
  // Reveal a non-mine tile
  const updatedIndices = descubrido(i);
  const updatedTiles = updatedIndices.length === 1 ?
      [[[i, state.board.tiles[i]]]] :
      Object
          .entries(updatedIndices.reduce(
              // Group indices by their distance from the clicked tile
              (groups, j) => {
                const d = dist(i, j, state.board.width);
                (groups[d] || (groups[d] = [])).push(j);
                return groups;
              },
              {}))
          .sort(([d1], [d2]) => d1 - d2)
          .map(([d, indices]) => indices.map(j => [j, state.board.tiles[j]]));
  if (state.tilesLeftToReveal === 0) {
    state.gameInProgress = false;
    return {gameWon: true, flags: state.board.flags, tiles: updatedTiles};
  } else {
    return {flags: state.board.flags, tiles: updatedTiles};
  }
}

// Clears all surrounding tiles, moving any mines to random new locations
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
  const stack = [i];
  while (stack.length > 0) {
    const j = stack.pop();
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
      forEachNbrIndex(j, (nbr) => stack.push(nbr));
    }
  }
  return updatedIndices;
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

exports.state = state;
exports.restart = restart;
exports.handleClick = handleClick;
