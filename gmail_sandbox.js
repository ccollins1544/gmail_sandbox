/**
 * ===============[ TABLE OF CONTENTS ]=================
 * 0. Initialize
 *   0.1 Libraries 
 *   0.2 Globals
 * 
 * 1. Helper Functions 
 *   1.1 keepTokenAlive
 *   1.1 checkAccess
 *   1.3 someCallback
 * 
 * 2. Main Tests Functions 
 *   2.1 TESTS
 *   2.2 main 
 *   2.3 RUN TESTS
 * 
 ******************************************************
/* ===============[ 0. Initialize ]===================*/
// 0.1 Libraries 
process.env.DOTENV_LOADED || require("dotenv").config();
require("colors");
const debug = require("debug")("gmail_sandbox");
const fs = require('fs');
const path = require("path");
const Utils = require("./utils");
const GmailSandbox = require('./lib/GmailSandbox');

// 0.2 Globals
// GMAIL Token Credentials 
const PATH_TO_GMAIL_CREDENTIALS = path.join(__dirname, 'config/gmail-credentials.json');
const creds_token_user = fs.existsSync(PATH_TO_GMAIL_CREDENTIALS) ? JSON.parse(fs.readFileSync(PATH_TO_GMAIL_CREDENTIALS, 'utf8')) : {};

const PATH_TO_GOOGLE_DRIVE_CREDENTIALS = path.join(__dirname, 'config/google-drive-creds.json');
const creds_service_user = fs.existsSync(PATH_TO_GOOGLE_DRIVE_CREDENTIALS) ? JSON.parse(fs.readFileSync(PATH_TO_GOOGLE_DRIVE_CREDENTIALS, 'utf8')) : {};

// Gmail Token
const TOKEN_DIR = path.join(__dirname, '.keys/');
const PATH_TO_GMAIL_TOKEN = TOKEN_DIR + 'gmail-token.json';
const creds_gmail_token = fs.existsSync(PATH_TO_GMAIL_TOKEN) ? JSON.parse(fs.readFileSync(PATH_TO_GMAIL_TOKEN, 'utf8')) : {};

// File
const fileName = "a\\testFile.txt";
const rootPath = `C:\\Users\\ccollins\\Downloads`;
const localPath = path.join(rootPath, fileName);

// Source and Destination Paths 
const gDrivePath = localPath.split(/[\\\/]/).slice(-1).join('/');

// Source and Destination Prefixes
const gDrivePrefix = fileName.split(/[\\\/]/).slice(0, -1).join('/');

// GmailSandbox options 
const ROOT_FOLDER = process.env.GDRIVE_ROOT_FOLDER;
const GOOGLE_AUTH_SCOPE = [process.env.GOOGLE_GMAIL_SCOPE || 'https://www.googleapis.com/auth/gmail.readonly', process.env.GOOGLE_DRIVE_SCOPE || 'https://www.googleapis.com/auth/drive'];
const gmailInstance = new GmailSandbox({ ROOT_FOLDER, PATH_TO_GMAIL_TOKEN, GOOGLE_AUTH_SCOPE });

/* ===============[ 1. Helper Functions ]=============*/
/** 1.1 
 * Refreshes our gmail token.
 * 
 * @param {function} callback - if provided than will run the callback after refreshing the token
 * @return {*} gmail_service - gmail api service. If callback was provided than returns results of the callback.
 */
const keepTokenAlive = async (callback) => {
  let gmail_service;
  try {
    // Check if we have access 
    if (Date.now() > (creds_gmail_token.expiry_date || Date.now() - 1000)) {
      debug(`Expired ${((Date.now() - (creds_gmail_token.expiry_date || Date.now() - 1000)) / 60000).toFixed(2)} minutes ago`.magenta);
    } else {
      debug(`Token should be valid until ${Utils.formatDate(creds_gmail_token.expiry_date || Date.now())}`.yellow);
    }

    gmail_service = await gmailInstance.useTokenAccountAuth(creds_token_user, PATH_TO_GMAIL_TOKEN, creds_gmail_token, callback);
    debug("Token is valid!".green);

  } catch (ex) {
    debug(ex.stack);
    debug("Access denied. Trying to request Auth Token".magenta);

    gmail_service = await gmailInstance.requestAuthToken(creds_token_user, PATH_TO_GMAIL_TOKEN, callback);

    if (gmailInstance.isAuthActive(gmail_service)) {
      debug("Our auth token is valid!".green);
    } else {
      debug("===============[ Error ]=================".red);
      debug("Our auth token is not valid!".red);
      debug("=========================================".red);
      return
    }
  }

  if (!callback) {
    debug("returning gmail_service".yellow);
  } else {
    debug("returning callback results".yellow);
  }

  return gmail_service;
}

// 1.2 Check Access
const checkAccess = async () => {
  let gdrive;
  try {
    // Check if we have access 
    gdrive = await gmailInstance.useServiceAccountAuth(creds_service_user);
  } catch (ex) {
    debug("===============[ Error ]=================".red);
    debug(ex.stack);
    debug("=========================================".red);
  }

  return gdrive;
}

/** 1.3
 * A test callback function to show example usage of a callback in keepTokenAlive()
 * 
 * @return {object} this - object of whatever was bind to the callback. 
 * For example, someCallback.(args.inputParams) 
 */
const someCallback = function () {
  debug("Running someCallback function".yellow);
  return this;
}

/* =========[ 2. Main Tests Functions  ]==============*/
// 2.1 TESTS
const TESTS = [
  {
    "name": "Read Gmail",
    "enabled": true,
    "function": "readGmail",
    "args": { 'q': 'label:inbox' },
  },
  {
    "name": `List Files in ${gDrivePrefix}`,
    "enabled": true,
    "function": "listFiles",
    "args": { 'pageToken': null, 'recursive': true, gDrivePrefix },
  },
  {
    "name": `List Folders in ${gDrivePrefix}`,
    "enabled": false,
    "function": "listFiles",
    "args": { 'pageToken': null, 'recursive': true, gDrivePrefix, 'listFolders': true },
  }
];

const EXAMPLES = [
  {
    "id": 1,
    "name": "With Callback",
    "enabled": false,
    "description": "Refreshes token and then runs a callback"
  },
  {
    "id": 2,
    "name": "With gmail or gdrive service",
    "enabled": false,
    "description": "Gives you direct access to googlesapi where you can invoke the api functions directly"
  },
  {
    "id": 3,
    "name": "With gmailInstance",
    "enabled": true,
    "description": "This is the most ideal way because you can have access to all of gmailInstance functions with valid google_auth"
  },
];

const EXAMPLE = EXAMPLES.find(({ enabled }) => enabled === true)

/** 2.2 
 * Example Usage: 
 * node --trace-warnings gmail_sandbox.js
 * node gmail_sandbox.js --inputFunction="readGmail" --q="label:inbox"
 * node gmail_sandbox.js --inputFunction="listFiles" --gDrivePrefix="a"
 * 
 * @param {*} inputFunction - function ran by TESTS or invoked directly through yargs 
 * @param {*} inputParams - parameters for inputFunction  
 * 
 * @return {number} exit_code 
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
    debug('node gmail_sandbox.js --inputFunction="listFiles" --gDrivePrefix="a"'.cyan);
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
      switch (EXAMPLE.id) {
        case 1:
          // With Callback
          debug(`===================[ Ex${EXAMPLE.id}. ${EXAMPLE.name} ]==============================`.bgWhite.blue);
          debug(`${EXAMPLE.description}`.bold.brightYellow);
          if (['readGmail'].includes(args.inputFunction)) {
            results = await keepTokenAlive(someCallback.bind(args.inputParams));
          }

          if (['listFiles'].includes(args.inputFunction)) {
            results = await checkAccess(someCallback.bind(args.inputParams));
          }

          break;

        case 2:
          // With gmail or gdrive service
          debug(`===================[ Ex${EXAMPLE.id}. ${EXAMPLE.name} ]==============================`.bgWhite.blue);
          debug(`${EXAMPLE.description}`.bold.brightYellow);
          if (['readGmail'].includes(args.inputFunction)) {
            let gmail = await keepTokenAlive();
            results = await gmail.users.messages.list(args.inputParams);
            results = (results && results.data) ? results.data : undefined;
          }

          if (['listFiles'].includes(args.inputFunction)) {
            let gdrive = await checkAccess();
            results = await gdrive.files.listAsync(args.inputParams);
            results = (results && results.data) ? results.data : undefined;
          }

          break;

        case 3:
          // With gmailInstance
          debug(`===================[ Ex${EXAMPLE.id}. ${EXAMPLE.name} ]==============================`.bgWhite.blue);
          debug(`${EXAMPLE.description}`.bold.brightYellow);
          if (['readGmail'].includes(args.inputFunction)) {
            await keepTokenAlive();
          }

          if (['listFiles'].includes(args.inputFunction)) {
            await checkAccess();
          }

          results = await gmailInstance[args.inputFunction](args.inputParams);
          break;

        default:
          debug("No Examples are enabled".yellow);
          break;
      }

    } else {
      throw Error(`Invalid function: ${args.inputFunction}`.brightRed);
    }

  } catch (error) {
    debug("=========================================".red);
    debug(error);
    debug("=========================================".red);
    return 1;
  }

  debug("_____________[ RESULTS ]___________________".rainbow);
  debug(results)
  debug("___________________________________________".rainbow);
  return 0;
}

// 2.3 RUN TESTS
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