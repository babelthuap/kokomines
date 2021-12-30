'use strict';

function dist(i, j, width) {
  const ix = i % width;
  const iy = (i - ix) / width;
  const jx = j % width;
  const jy = (j - jx) / width;
  return (ix - jx) * (ix - jx) + (iy - jy) * (iy - jy);
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

exports.dist = dist;
exports.shuffle = shuffle;
exports.rand = rand;
