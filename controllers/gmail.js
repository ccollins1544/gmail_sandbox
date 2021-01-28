process.env.DOTENV_LOADED || require('dotenv').config();
require('colors');
const debug = require('debug')('controllers:gmail');
// const fs = require('fs');
const path = require('path');
const Utils = require('../utils');
// const readline = require('readline');
const { google } = require('googleapis');
// const SCOPES = [process.env.GOOGLE_SCOPE || 'https://www.googleapis.com/auth/gmail.readonly'];

// GMAIL Token Credentials 
const PATH_TO_GMAIL_CREDENTIALS = path.join(__dirname, '../config/gmail-credentials.json');
const creds_gmail_token = require(PATH_TO_GMAIL_CREDENTIALS);

const TOKEN_DIR = path.join(__dirname, '../.keys/');
const PATH_TO_GMAIL_TOKEN = TOKEN_DIR + 'gmail-token.json';

const gmail = google.gmail('v1');

/**
 * Read Emails in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
const readGmail = async ({ auth, userId, q }) => {
  if (!auth) {
    auth = _this.auth;
  }

  if (!userId) {
    userId = 'me';
  }

  if (!q) {
    q = 'label:inbox'
  }

  let request = {
    ...(auth && { auth }),
    ...(userId && { userId }),
    ...(q && { q })
  }

  // console.log("============[ REQUEST ]=================".rainbow);
  // console.log(request);
  // console.log("=========================================".rainbow);

  let messages = await gmail.users.messages.list(request)
    .then(async (response) => {
      request.q = 'FULL';
      let results = [];

      // console.log("============[ response ]=================".magenta);
      // console.log(response.data);
      // console.log("=========================================".magenta);

      if (response.data && response.data.messages && Array.isArray(response.data.messages)) {

        // console.log("============[ MESSAGES ]=================".magenta);
        // console.log(response.data.messages);
        // console.log("=========================================".magenta);

        results = await Utils.asyncReduce(response.data.messages, async (acc, msg) => {
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

                  // console.log("============[ MSG ]======================".magenta);
                  // console.log(JSON.stringify(mResponse.data.messages[0], null, 2));
                  // console.log("=========================================".magenta);

                  return {
                    Subject,
                    To,
                    From,
                    Date: Utils.formatDate(Date),
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

module.exports = {
  readGmail
}