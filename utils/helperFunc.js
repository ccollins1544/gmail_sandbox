/**
 * ===============[ TABLE OF CONTENTS ]===============
 * 1. Helper Functions
 *   1.1 formatDate
 * 
 ******************************************************/
/* ===============[ Libraries ]========================*/
process.env.DOTENV_LOADED || require("dotenv").config();
require("colors");
const moment = require('moment-timezone');

/**
 * Detect client timezone and convert date accordingly 
 * 
 * 1.1
 * @param {*} timestamp 
 * @param {*} formatString 
 */
const formatDate = (timestamp = Date.now(), formatString = "MMMM D, YYYY hh:mm:ss A", tZone = Intl.DateTimeFormat().resolvedOptions().timeZone) => {
  return moment(timestamp).tz(tZone).format(formatString);
}

const isObject = (object) => {
  return object != null && typeof object === 'object';
}

const helperFunc = {
  formatDate,
  isObject
}

module.exports = helperFunc;