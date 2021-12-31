'use strict';

const {dist, shuffle, rand} = require('./util.js');
const {time} = require('./logger.js');

// Public state
let gameInProgress = false;
let board = null;

// Private state
let firstClick = null;
let tilesLeftToReveal = null;
let minePositions = null;
let adjacentMines = null;

// First initialization
restart();

// Restarts the game if it's not currently in progress
function restart() {
  if (!gameInProgress && !restart.ing) {
    restart.ing = true;
    initGameState();
    gameInProgress = true;
    setTimeout(() => restart.ing = false, 1000);
    return true;
  } else {
    return false;
  }
}
restart.ing = false;

// Handles a click on the given tile
function handleClick(i, button) {
  const [revealed] = board.tiles[i];
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
    firstClick = true;

    const numTiles = width * height;
    const numMines = Math.round(numTiles * density);

    tilesLeftToReveal = numTiles - numMines;
    board = {
      width: width,
      height: height,
      mines: numMines,
      flags: 0,
      tiles: new Array(numTiles),
    };
    for (let i = 0; i < numTiles; i++) {
      board.tiles[i] = [false, null];  // [revealed, label]
    }

    minePositions = new Array(numTiles).fill(false);
    for (let i = 0; i < numMines; i++) {
      minePositions[i] = true;
    }
    shuffle(minePositions);

    adjacentMines = new Array(numTiles).fill(0);
  });
}

// Reveals a tile
function reveal(i) {
  // Clear all surrounding tiles on the first click
  if (firstClick) {
    firstClick = false;
    clearMines(i);
  }

  let updatedIndices;
  let result = {};
  if (minePositions[i]) {
    // Go boom
    const tile = board.tiles[i];
    tile[0] = true;
    tile[1] = 'M';
    gameInProgress = false;
    updatedIndices = minePositions.reduce((arr, _, i) => {
      arr.push(i);
      return arr;
    }, []);
    result.gameWon = false;
  } else {
    // Reveal a non-mine tile
    updatedIndices = descubrido(i);
    if (tilesLeftToReveal === 0) {
      gameInProgress = false;
      result.gameWon = true;
    }
  }

  const updatedTiles = updatedIndices.length === 1 ?
      [[[i, board.tiles[i]]]] :
      Object
          .entries(updatedIndices.reduce(
              // Group indices by their distance from the clicked tile
              (groups, j) => {
                const d = dist(i, j, board.width);
                (groups[d] || (groups[d] = [])).push(j);
                return groups;
              },
              {}))
          .sort(([d1], [d2]) => d1 - d2)
          .map(([d, indices]) => indices.map(j => [j, board.tiles[j]]));

  result.flags = board.flags;
  result.tiles = updatedTiles;
  return result;
}

// Clears all surrounding tiles, moving any mines to random new locations
function clearMines(i) {
  let minesToReplace = 0;
  const indicesToAvoid = new Set();
  indicesToAvoid.add(i);
  if (minePositions[i]) {
    minePositions[i] = false;
    minesToReplace++;
  }
  forEachNbrIndex(i, (nbr) => {
    indicesToAvoid.add(nbr);
    if (minePositions[nbr]) {
      minePositions[nbr] = false;
      minesToReplace++;
    }
  });
  while (minesToReplace > 0) {
    const r = rand(board.tiles.length - 1);
    if (!minePositions[r] && !indicesToAvoid.has(r)) {
      minePositions[r] = true;
      minesToReplace--;
    }
  }
  // Calculate adjacentMines
  for (let i = 0; i < board.tiles.length; i++) {
    if (minePositions[i]) {
      forEachNbrIndex(i, (nbr) => adjacentMines[nbr]++);
    }
  }
}

// A new cavern has been discovered?
function descubrido(i) {
  const updatedIndices = [];
  const stack = [i];
  while (stack.length > 0) {
    const j = stack.pop();
    const tile = board.tiles[j];

    if (tile[0 /* revealed */]) {
      continue;
    }
    tile[0 /* revealed */] = true;
    tilesLeftToReveal--;

    if (tile[1 /* label */]) {
      // Remove flag
      tile[1] = null;
      board.flags--;
    }
    const numAdjacentMines = adjacentMines[j];
    if (numAdjacentMines > 0) {
      tile[1 /* label */] = numAdjacentMines;
    }

    updatedIndices.push(j);
    if (numAdjacentMines === 0 && !minePositions[j]) {
      forEachNbrIndex(j, (nbr) => stack.push(nbr));
    }
  }
  return updatedIndices;
}

// Toggles a flag
function flag(i) {
  const tile = board.tiles[i];
  const label = tile[1];
  if (label) {
    tile[1] = null;
    board.flags--;
  } else {
    tile[1] = 'F';
    board.flags++;
  }
  return {flags: board.flags, tiles: [[[i, tile]]]};
}

// Executes a function for each neighboring tile index
function forEachNbrIndex(i, fn) {
  const width = board.width;
  const x = i % width;
  const y = (i - x) / width;

  let upExists = y > 0;
  let downExists = y < board.height - 1;
  let leftExists = x > 0;
  let rightExists = x < board.width - 1;

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

exports.getPublicState = () => ({gameInProgress, board});
exports.restart = restart;
exports.handleClick = handleClick;
