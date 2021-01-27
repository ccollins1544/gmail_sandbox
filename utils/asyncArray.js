
/**
 * ===============[ TABLE OF CONTENTS ]=================
 * 1. Async Array Functions 
 *   1.1 asyncFilter
 *   1.2 asyncForEach
 *   1.3 asyncMap
 *   1.4 asyncReduce
 *   1.5 asyncSome
 * 
 ******************************************************/
/* ===============[ 1. Async Array Functions ]========*/
/**
 * 1.1 asyncFilter
 * @param {Array} arr 
 * @param {Function} cb 
 */
const asyncFilter = async (arr, cb) => {
  if (!Array.isArray(arr)) {
    throw new TypeError('arr must be an array');
  }
  const filteredArray = [];

  let len = arr.length;
  for (let i = 0; i < len; i++) {
    if (await cb(arr[i], i, arr)) {
      filteredArray.push(arr[i])
    }
  }

  return filteredArray;
}

/**
 * 1.2 asyncForEach
 * @param {Array} arr 
 * @param {Function} cb 
 */
const asyncForEach = async (arr, cb) => {
  if (!Array.isArray(arr)) {
    throw new TypeError('arr must be an array');
  }

  let len = arr.length;
  for (let i = 0; i < len; i++) {
    await cb(arr[i], i, arr);
  }
}

/**
 * 1.3 asyncMap
 * @param {Array} arr 
 * @param {Function} cb 
 */
const asyncMap = async (arr, cb) => {
  if (!Array.isArray(arr)) {
    throw new TypeError('arr must be an array');
  }

  let len = arr.length;
  const resp = new Array(len);
  for (let i = 0; i < len; i++) {
    resp[i] = await cb(arr[i], i, arr);
  }

  return resp;
}

/**
 * 1.4 asyncReduce
 * @param {Array} arr 
 * @param {Function} cb 
 * @param {*} val 
 */
const asyncReduce = async (arr, cb, val) => {
  if (!Array.isArray(arr)) {
    throw new TypeError('arr must be an array');
  }

  let len = arr.length;
  for (let i = 0; i < len; i++) {
    val = await cb(val, arr[i], i, arr);
  }

  return val;
}

/**
 * 1.5 asyncSome
 * @param {Array} arr 
 * @param {Function} cb 
 */
const asyncSome = async (arr, cb) => {
  if (!Array.isArray(arr)) {
    throw new TypeError('arr must be an array');
  }

  let len = arr.length;
  for (let i = 0; i < len; i++) {
    const isFinished = await cb(arr[i], i, arr);
    if (isFinished) {
      return isFinished;
    };
  }
}

module.exports = {
  asyncFilter,
  asyncForEach,
  asyncMap,
  asyncReduce,
  asyncSome
};