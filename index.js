// 0.1 Libraries 
process.env.DOTENV_LOADED || require('dotenv').config();
require('colors');
const debug = require('debug')('gmail');
const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const readline = require('readline');
const { google } = require('googleapis');
const SCOPES = [process.env.GOOGLE_SCOPE || 'https://www.googleapis.com/auth/gmail.readonly'];

// GMAIL Token Credentials 
const PATH_TO_GMAIL_CREDENTIALS = path.join(__dirname, 'config/gmail-credentials.json');
const creds_gmail_token = require(PATH_TO_GMAIL_CREDENTIALS);

const TOKEN_DIR = path.join(__dirname, '.keys/');
const PATH_TO_GMAIL_TOKEN = TOKEN_DIR + 'gmail-token.json';

const gmail = google.gmail('v1');

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];

  var OAuth2 = google.auth.OAuth2;

  var oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(PATH_TO_GMAIL_TOKEN, function (err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
  console.log('Authorize this app by visiting this url: '.magenta, authUrl.yellow);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\nEnter the code from that page here: '.magenta, function (code) {
    rl.close();
    oauth2Client.getToken(code, function (err, token) {
      if (err) {
        debug('Error while trying to retrieve access token'.red, err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token, () => {
        callback(oauth2Client);
      });
      // callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token, cb) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }

  debug(`Callback is: ${typeof cb}`.yellow);

  fs.writeFile(PATH_TO_GMAIL_TOKEN, JSON.stringify(token), cb);
  debug(`Token stored to ${PATH_TO_GMAIL_TOKEN}`.green);
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth) {
  gmail.users.labels.list({ auth: auth, userId: 'me', }, function (err, response) {
    if (err) {
      debug('The API returned an error: '.red + err);
      return;
    }

    var labels = response.data.labels;

    if (labels.length == 0) {
      debug('No labels found.'.yellow);

    } else {
      debug('Labels:'.magenta);
      for (var i = 0; i < labels.length; i++) {
        var label = labels[i];
        debug('%s', label.name);
      }
    }
  });
}

/**
 * Read Emails in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
const readGmail = async (auth, q = 'label:inbox') => {
  let request = {
    auth,
    userId: 'me',
    ...(q && { q })
  }

  let messages = await gmail.users.messages.list(request)
    .then(async (response) => {
      request.q = 'FULL';
      let results = [];

      if (response.data && response.data.messages && Array.isArray(response.data.messages)) {
        results = await utils.asyncReduce(response.data.messages, async (acc, msg) => {
          const { id } = msg;
          if (id) {
            request.id = id;
            let fullMessage = await gmail.users.threads.get(request)
              .then((mResponse) => {
                if (mResponse.data.messages && Array.isArray(mResponse.data.messages)) {
                  let Subject = mResponse.data.messages[0].payload.headers.find(({ name }) => name === "Subject").value || "";
                  let To = mResponse.data.messages[0].payload.headers.find(({ name }) => name === "To").value || "";
                  let From = mResponse.data.messages[0].payload.headers.find(({ name }) => name === "From").value || "";
                  let Date = mResponse.data.messages[0].payload.headers.find(({ name }) => name === "Date").value || Date.now();
                  let internalDate = mResponse.data.messages[0].internalDate;
                  let snippet = mResponse.data.messages[0].snippet.trim();

                  // console.log("=".repeat(50).cyan);
                  // console.log(JSON.stringify(mResponse.data.messages[0], null, 2));
                  // console.log("=".repeat(50).cyan);

                  return {
                    Subject,
                    To,
                    From,
                    Date: utils.formatDate(Date),
                    internalDate,
                    snippet
                  }
                }

                return false;
              }).catch((err) => {
                debug('Error getting email'.red);
                debug(err, err.stack, err.message);
                throw err;
              });

            if (fullMessage) {
              acc.push(fullMessage);
            }
          }

          return acc;
        }, []);
      }

      return results;
    }).catch((err) => {
      debug('Error reading emails'.red);
      debug(err, err.stack, err.messages);
      throw err;
    });

  debug("_____________[ RESULTS ]___________________".green);
  debug(messages);
  debug("___________________________________________".green);
}

// Load client secrets from a local file.
fs.readFile(PATH_TO_GMAIL_CREDENTIALS, function processClientSecrets(err, content) {
  if (err) {
    debug('Error loading client secret file: '.red + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  // authorize(JSON.parse(content), listLabels);
  authorize(JSON.parse(content), readGmail);
});