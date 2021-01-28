process.env.DOTENV_LOADED || require('dotenv').config();
require('colors');
const debug = require('debug')('GmailSandbox');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const Utils = require('../utils');
const readline = require('readline');
const { google } = require('googleapis');
const gmail = google.gmail('v1');

// const GoogleAuth = require('google-auth-library');
// const { GoogleAuth } = require('google-auth-library');
// const { OAuth2Client } = require('google-auth-library');
// ISSUE: https://github.com/googleapis/google-auth-library-nodejs/issues/251

/**
 * Testing google api
 * 
 * @param {Object} options 
 */
const GmailSandbox = function (options) {
  var _this = this;
  this.name = 'Gmail Sandbox';

  if (!options) {
    options = {};
  }

  _this.options = options;
  _this.options.PATH_TO_GMAIL_TOKEN = _this.options.PATH_TO_GMAIL_TOKEN || path.join(__dirname, '../.keys/gmail-token.json');
  _this.options.GOOGLE_AUTH_SCOPE = _this.options.GOOGLE_AUTH_SCOPE || [
    'https://www.googleapis.com/auth/gmail.readonly'
  ];

  var auth_client = google.auth.OAuth2
  // var auth_client = new GoogleAuth();
  // var auth_client = new OAuth2Client();
  // _this.service = {
  //   users: null
  // }

  _this.auth = null;
  _this.service = null;
  // _this.service = {
  //   users: {
  //     messages: {
  //       list: null
  //     }
  //   }
  // }

  /**
   * Sets the setvice.
   *
   * @param      {Object}  google_auth  - google auth type instance. Either Oauth2 or JWT
   * @return     {Object}  service property of this instance, with promisified methods for the users namespace
   */
  const setService = function (google_auth, callback) {
    if (typeof callback === 'function') {
      // return callback({ 'auth': google_auth }); // works with gmail controller 
      return callback();
    }

    _this.auth = google_auth;
    // return google_auth;
    return Promise.try(function () {
      // let service = google.gmail({
      //   version: 'v1',
      //   auth: google_auth
      // });

      let service = google.gmail('v1');
      // let service = gmail.users.messages.list({ 'auth': google_auth, 'userId': 'me' });
      return service;
    }).then(function (service) {
      _this.service = Promise.promisifyAll(service);
      // _this.service.users = Promise.promisifyAll(service.users);
      // return _this.service;
      return _this.auth;
    });
  };

  const storeOauthToken = function (new_token, token_path) {
    return fs
      .writeFileAsync(token_path, JSON.stringify(new_token, null, 2))
      .then(function () {
        debug(`Token stored to ${token_path}`.green);
        return new_token;
      });
  };

  const renewOauthToken = function (google_auth, token_path, callback) {
    return Promise.try(function () {
      return new Promise(resolve => {
        google_auth
          .refreshAccessToken(async (err, new_token) => {
            resolve(await storeOauthToken(new_token, token_path));
          })
      }).then((_new_token) => {
        google_auth.credentials = _new_token;
        debug(`new token expiry date ${Utils.formatDate(_new_token.expiry_date)}`.bold.brightYellow);
        return setService(google_auth, callback);
      });
    });
  };

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   *
   * @param      {google.auth.OAuth2}  google_auth  The OAuth2 client to get token for
   * @param      {string}              token_path   The token path
   * @return     {Promise<Object>}     The service property of this instance
   */
  const getNewOauthToken = (google_auth, token_path) => {
    var authUrl = google_auth.generateAuthUrl({
      access_type: 'offline',
      scope: _this.options.GOOGLE_AUTH_SCOPE
    });

    console.log('\nAuthorize this app by visiting this url: '.magenta, authUrl.yellow);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => rl.question('\nEnter the code from that page here: '.magenta, (code) => {
      rl.close();
      google_auth
        .getToken(code, async (err, new_token) => {
          google_auth.credentials = new_token;
          await storeOauthToken(new_token, token_path);
          return resolve(google_auth);
        });

    })).then((_google_auth) => {
      return setService(_google_auth);
    });
  };

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   *
   * @param {Object} credentials The authorization client credentials.
   * @param {string} token_path the path to store the client token
   *
   * @return {Promise} a promise that unfolds to a new auth token
   */
  const authorizeClientSecret = function (credentials, token_path, tokenObj, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var google_auth = new auth_client(
      clientId,
      clientSecret,
      redirectUrl
    );

    if (tokenObj != null && typeof tokenObj === 'object') {
      google_auth.credentials = tokenObj;
      return renewOauthToken(google_auth, token_path, callback);
    }

    // Check if we have previously stored a token.
    return fs
      .readFileAsync(token_path)
      .then(function (token) {
        google_auth.credentials = JSON.parse(token);

        return renewOauthToken(google_auth, token_path, callback);
      })
      .catch(function (err) {
        debug(err);
        return getNewOauthToken(google_auth, token_path);
      });
  };

  const renewJwtAuth = function (google_auth) {
    return new Promise(function (resolve, reject) {
      google_auth.authorize(function (err, token) {
        if (err) {
          reject(err);
        }
        resolve(setService(google_auth));
      });
    });
  };

  // Use a service account
  _this.useServiceAccountAuth = function (creds) {
    debug('trying to use service account'.cyan);
    return Promise.try(function () {
      let credsObj;

      if (typeof creds === 'string') {
        credsObj = require(creds);
      } else if (typeof creds === 'object') {
        credsObj = creds;
      }
      return credsObj;
    }).then(function (credsObj) {
      // let google_auth = auth_client(
      let google_auth = new auth_client.JWT(
        credsObj.client_email,
        null,
        credsObj.private_key,
        _this.options.GOOGLE_AUTH_SCOPE,
        null
      );
      return renewJwtAuth(google_auth);
    });
  };

  // Request an auth token using a client secret json file
  _this.requestAuthToken = function (creds, token_path, callback) {
    return Promise.try(function () {
      let credsObj;
      if (typeof creds === 'string') {
        credsObj = require(creds);
      } else if (typeof creds === 'object') {
        credsObj = creds;
      }
      return credsObj;
    }).then(function () {
      return authorizeClientSecret(creds, token_path, null, callback);
    });
  };

  // Use a token account
  _this.useTokenAccountAuth = function (creds, token_path, tokenObj, callback) {
    debug('trying to use token account'.cyan);
    return Promise.try(function () {
      let credsObj;

      if (typeof creds === 'string') {
        credsObj = require(creds);
      } else if (typeof creds === 'object') {
        credsObj = creds;
      }
      return credsObj;
    }).then(function (credsObj) {
      return authorizeClientSecret(creds, token_path, tokenObj, callback);
    });
  };

  // Use an existing auth token
  _this.useAuthToken = function (token, cb) { };

  _this.isAuthActive = function (google_auth) {
    return !!google_auth;
  };

  return _this;
}

GmailSandbox.prototype.readGmail = async ({ auth, userId, q }) => {
  debug('Trying readGmail'.yellow);
  var _this = this;

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

  // return await _this.service.users.messages.list(request)
  return await gmail.users.messages.list(request)
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
}

module.exports = GmailSandbox;
