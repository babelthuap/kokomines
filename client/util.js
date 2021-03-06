// Returns the (square of) the Euclidean distance between two tiles
export const dist = (i, j, width) => {
  const ix = i % width;
  const iy = (i - ix) / width;
  const jx = j % width;
  const jy = (j - jx) / width;
  return (ix - jx) * (ix - jx) + (iy - jy) * (iy - jy);
};

// Shuffles an array in place
export const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    let j = rand(i);
    let temp = arr[j];
    arr[j] = arr[i];
    arr[i] = temp;
  }
  return arr;
};

// Gets random int in [0, n]
export const rand = (n) => Math.floor((n + 1) * Math.random());

// Gets a map from id -> el for all elements with and ID.
export const getIdEl = (root) => {
  return [...root.querySelectorAll('[id]')].reduce((idEl, el) => {
    idEl[el.id] = el;
    return idEl;
  }, {});
};
