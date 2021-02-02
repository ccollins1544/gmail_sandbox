process.env.DOTENV_LOADED || require('dotenv').config();
require('colors');
const debug = require('debug')('GmailSandbox');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const Utils = require('../utils');
const readline = require('readline');
const { google } = require('googleapis');

// @todo 
// const GoogleAuth = require('google-auth-library');
// const { GoogleAuth } = require('google-auth-library');

// const { OAuth2Client } = require('google-auth-library');
// ISSUE: https://github.com/googleapis/google-auth-library-nodejs/issues/251

/**
 * Testing google api
 * 
 * @param {object} options 
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

  _this.service = {
    users: null
  };

  /**
   * Sets the service.
   *
   * @param {object} google_auth - google auth type instance. Either OAuth2 or JWT
   * @return {object} service property of this instance, with promisified methods for the users namespace
   */
  const setService = function (google_auth, callback) {
    debug("trying to setService".cyan);
    return Promise.try(function () {
      let service = google.gmail({
        version: 'v1',
        auth: google_auth
      });

      return service;
    }).then(async (service) => {
      _this.service.users = Promise.promisifyAll(service.users);

      if (typeof callback === 'function') {
        return await callback();
      }
      return _this.service;
    });
  };

  /**
   * Stores new_token locally to token_path
   * 
   * @param {object} new_token 
   * @param {string} token_path - local path to where token should be stored
   * 
   * @return {object} new_token
   */
  const storeOauthToken = function (new_token, token_path) {
    debug('trying to storeOauthToken'.cyan);
    return fs
      .writeFileAsync(token_path, JSON.stringify(new_token, null, 2))
      .then(function () {
        debug(`Token stored to ${token_path}`.green);
        return new_token;
      });
  };

  /**
   * Renew token using google_auth
   * 
   * @param {google.auth.OAuth2} google_auth - google auth type instance
   * @param {string} token_path - local path to where token should be stored
   * @param {function} callback - passed through to next function 
   * 
   * @return setService function with google_auth and callback 
   */
  const renewOauthToken = function (google_auth, token_path, callback) {
    debug('trying to renewOauthToken'.cyan);
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
   * @param {google.auth.OAuth2} google_auth - The OAuth2 client to get token for
   * @param {string} token_path - The token path
   * 
   * @return {Promise<Object>} - The service property of this instance
   */
  const getNewOauthToken = (google_auth, token_path, callback) => {
    debug('trying to getNewOauthToken'.cyan);
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
      return setService(_google_auth, callback);
    });
  };

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   *
   * @param {object} credentials The authorization client credentials.
   * @param {string} token_path the path to store the client token
   *
   * @return {Promise} a promise that unfolds to a new auth token
   */
  const authorizeClientSecret = function (credentials, token_path, tokenObj, callback) {
    debug('trying to authorizeClientSecret'.cyan);
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var google_auth = new auth_client(
      clientId,
      clientSecret,
      redirectUrl
    );

    if (tokenObj != null && typeof tokenObj === 'object' && Object.keys(tokenObj).length > 0) {
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
        return getNewOauthToken(google_auth, token_path, callback);
      });
  };

  /**
   * @todo 
   * @param {google.auth.OAuth2} google_auth 
   * @param {function} callback 
   * 
   * @return {Promise} a promise (setService) that returns service property of this instance with promisified methods
   */
  const renewJwtAuth = function (google_auth, callback) {
    debug('trying to renewJwtAuth'.cyan);
    return new Promise(function (resolve, reject) {
      google_auth.authorize(function (err, token) {
        if (err) {
          reject(err);
        }
        resolve(setService(google_auth, callback));
      });
    });
  };

  // @todo
  // Use a service account
  _this.useServiceAccountAuth = function (creds, callback) {
    debug('trying to useServiceAccountAuth'.cyan);
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
      return renewJwtAuth(google_auth, callback);
    });
  };

  // Request an auth token using a client secret json file
  _this.requestAuthToken = function (creds, token_path, callback) {
    debug('trying to requestAuthToken'.cyan);
    return Promise.try(function () {
      let credsObj;
      if (typeof creds === 'string') {
        credsObj = require(creds);
      } else if (typeof creds === 'object') {
        credsObj = creds;
      }
      return credsObj;
    }).then(function (credsObj) {
      return authorizeClientSecret(credsObj, token_path, null, callback);
    });
  };

  // Use a token account
  _this.useTokenAccountAuth = function (creds, token_path, tokenObj, callback) {
    debug('trying to useTokenAccountAuth'.cyan);
    return Promise.try(function () {
      let credsObj;

      if (typeof creds === 'string') {
        credsObj = require(creds);
      } else if (typeof creds === 'object') {
        credsObj = creds;
      }
      return credsObj;
    }).then(function (credsObj) {
      return authorizeClientSecret(credsObj, token_path, tokenObj, callback);
    });
  };

  // Use an existing auth token
  _this.useAuthToken = function (token, cb) {
    // @todo
  };

  _this.isAuthActive = function (google_auth) {
    return !!google_auth;
  };

  return _this;
}

GmailSandbox.prototype.readGmail = async function (params) {
  debug('Trying readGmail'.yellow);
  let { auth, userId, q } = params || {};
  var _this = this;

  if (!userId) {
    userId = 'me';
  }

  if (!q) {
    q = 'label:inbox'
  }

  let request = {
    ...(auth && { auth }), // Not needed because _this.service should already have been authorized with google_auth 
    ...(userId && { userId }),
    ...(q && { q })
  }

  return await _this.service.users.messages.list(request)
    .then(async (response) => {
      request.q = 'FULL';
      let results = [];

      if (response.data && response.data.messages && Array.isArray(response.data.messages)) {

        results = await Utils.asyncReduce(response.data.messages, async (acc, msg) => {
          request.id = msg?.id;

          let fullMessage = request.id == null ? false : await _this.service.users.threads.get(request)
            .then((mResponse) => {
              if (mResponse.data.messages && Array.isArray(mResponse.data.messages)) {
                let Subject = mResponse.data.messages[0].payload.headers.find(({ name }) => name === "Subject").value || "";
                let To = mResponse.data.messages[0].payload.headers.find(({ name }) => name === "To").value || "";
                let From = mResponse.data.messages[0].payload.headers.find(({ name }) => name === "From").value || "";
                let Date = mResponse.data.messages[0].payload.headers.find(({ name }) => name === "Date").value || Date.now();
                let internalDate = mResponse.data.messages[0].internalDate;
                let snippet = mResponse.data.messages[0].snippet.trim();

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

          return acc;
        }, []);
      }

      return results;
    }).catch((err) => {
      debug('Error reading emails'.red);
      debug(err, err.stack, err.messages);
      throw err;
    });
}

module.exports = GmailSandbox;
