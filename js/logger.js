'use strict';

const DEBUG = process.argv.slice(2).some(arg => arg.includes('debug'));

function log(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

function time(label, fn) {
  if (DEBUG) {
    const start = process.hrtime.bigint();
    fn();
    const end = process.hrtime.bigint();
    console.log(label, Number((end - start) / 1000n), 'μs');
  } else {
    fn();
  }
}

exports.log = log;
exports.time = time;
