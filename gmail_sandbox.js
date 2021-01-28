process.env.DOTENV_LOADED || require("dotenv").config();
require("colors");
const debug = require("debug")("gmail_sandbox");
// const Promise = require('bluebird');
// const fs = Promise.promisifyAll(require('fs'));
const path = require("path");
const Utils = require("./utils");
const GmailSandbox = require('./lib/GmailSandbox');
const gmailController = require('./controllers/gmail');

// ==================[ GLOBALS ]====================================
// GMAIL Token Credentials 
const PATH_TO_GMAIL_CREDENTIALS = path.join(__dirname, 'config/gmail-credentials.json');
const creds_token_user = require(PATH_TO_GMAIL_CREDENTIALS);

// Gmail Token
const TOKEN_DIR = path.join(__dirname, '.keys/');
const PATH_TO_GMAIL_TOKEN = TOKEN_DIR + 'gmail-token.json';
const creds_gmail_token = require(PATH_TO_GMAIL_TOKEN);

// GmailSandbox options 
const GOOGLE_AUTH_SCOPE = [process.env.GOOGLE_SCOPE || 'https://www.googleapis.com/auth/gmail.readonly'];
const gmailInstance = new GmailSandbox({ PATH_TO_GMAIL_TOKEN, GOOGLE_AUTH_SCOPE });

/* 
return new Promise((resolve, reject) => {
  return gmail.users.messages.list(request)
    // return _this.service.users.messages.list(request)
    // return _this.service(request)
    .then((response) => {

      console.log("============[ RESPONSE ]=================".magenta);
      console.log(response.data);
      console.log("=========================================".magenta);

      if (response && response.data && response.data.messages && Array.isArray(response.data.message)) {
        return resolve(response.data.messages);
      }

      reject(new Error("Error getting email"));
    }).catch((err) => {
      debug(err, err.stack, err.messages);
      reject(err);
    });
});
*/

// Keep Token Alive
const keepTokenAlive = async (callback) => {
  return await new Promise(async (resolve, reject) => {
    let google_auth;
    try {
      // Check if we have access 
      debug(`Token should be valid until ${Utils.formatDate(creds_gmail_token.expiry_date || Date.now())}`.yellow);

      debug("Checking if we have access".magenta);
      google_auth = await gmailInstance.useTokenAccountAuth(creds_token_user, PATH_TO_GMAIL_TOKEN, creds_gmail_token, callback);
      debug("Token is valid!".green);

    } catch (ex) {
      debug(ex.stack);
      debug("Access denied. Trying to request Auth Token".magenta);

      google_auth = await gmailInstance.requestAuthToken(creds_token_user, PATH_TO_GMAIL_TOKEN, callback);

      if (gmailInstance.isAuthActive(google_auth)) {
        debug("Our auth token is valid!".green);
      } else {
        debug("===============[ Error ]=================".red);
        debug("Our auth token is not valid!".red);
        debug("=========================================".red);
        reject(process.exit(1));
        return
      }
    }

    return resolve(google_auth);
  });
}

// TEST TO RUN
const TESTS = [
  {
    "name": "Read Gmail",
    "enabled": true,
    "function": "readGmail",
    "args": { 'q': 'label:inbox' },
  }
];

/**
 * Example Usage: 
 * node --trace-warnings gmail_sandbox.js
 * node gmail_sandbox.js --inputFunction="readGmail" --q="label:inbox"
 */
const main = async (inputFunction, inputParams) => {
  // Initiate Arguments
  let args;

  if (process.argv.length > 2) {
    args = require('yargs').argv;
    args.inputParams = {};
    let { inputFunction, ...remainingArgs } = require('yargs').argv || {};
    if (inputFunction) args = { inputFunction };

    if (remainingArgs) {
      if (typeof remainingArgs === 'string') {
        args.inputParams = require(remainingArgs);

      } else if (typeof remainingArgs === 'object') {
        args.inputParams = remainingArgs;
      }
    }

  } else if (inputParams) {
    args = { inputFunction, inputParams };

  } else {
    debug("===================================".yellow);
    debug("Invalid arguments passed.".yellow);
    debug({ ...inputParams, ...{ invalid_args: process.argv.slice(2) } });

    debug("\nExample Usage,");
    debug('node gmail_sandbox.js --inputFunction="readGmail" --q="label:inbox"'.cyan);
    debug("\nList of functions include: ");

    debug(TESTS.reduce((acc, t, i) => {
      if (t.function && !acc.includes(t.function)) {
        acc.push({
          'inputFunction': t.function,
          'inputParams': Object.keys(t.args)
        });
      }
      return acc;
    }, []));

    debug("===================================".yellow);

    return 1;
  }

  debug("*-*-*-*-*-*-*-[ args ]*-*-*-*-*-*-*-*-*-*".yellow);
  debug(args);
  debug("*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*".yellow);

  // Generate results;
  let results;
  try {
    if (gmailInstance[args.inputFunction]) {
      results = await keepTokenAlive(gmailController.readGmail);
      // results = await keepTokenAlive(gmailInstance.readGmail);

      // let auth = await keepTokenAlive();
      // args.inputParams = { ...inputParams, auth, 'userId': 'me' };
      // results = await gmailInstance[args.inputFunction](args.inputParams);

    } else {
      throw Error(`Invalid function: ${args.inputFunction}`.brightRed);
    }

  } catch (error) {
    debug("=========================================".red);
    debug(error);
    debug("=========================================".red);
    return 1;
  }

  debug("____________ results ____________________".rainbow);
  debug(results)
  debug("_________________________________________".rainbow);
  return 0;
}

// RUN TESTS
(async () => {
  let exit_code = 1;
  let counter = 0;

  await Utils.asyncForEach(TESTS, async (test) => {
    if (test.enabled) {
      debug(test.name.toString().brightYellow);
      exit_code = await main(test.function, test.args);
      counter++;
    }
  });

  if (counter === 0) {
    exit_code = await main();
  }

  process.exit(exit_code);
})();