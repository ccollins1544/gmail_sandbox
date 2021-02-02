process.env.DOTENV_LOADED || require('dotenv').config();
require('colors');
const debug = require('debug')('GmailSandbox');
const Promise = require('bluebird');
const _ = require('lodash');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const Utils = require('../utils');
const readline = require('readline');
const { google } = require('googleapis');

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
  _this.options.ROOT_FOLDER = _this.options.ROOT_FOLDER || null;
  _this.options.PATH_TO_GMAIL_TOKEN = _this.options.PATH_TO_GMAIL_TOKEN || path.join(__dirname, '../.keys/gmail-token.json');
  _this.options.GOOGLE_AUTH_SCOPE = _this.options.GOOGLE_AUTH_SCOPE || [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/drive'
  ];

  var auth_client = google.auth.OAuth2;
  var auth_client2 = google.auth;

  _this.service = {
    users: null,
  };

  _this.service2 = {
    files: null
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
   * Sets the service2.
   *
   * @param      {Object}  google_auth2  - google auth type instance. Either Oauth2 or JWT
   * @return     {Object}  service property of this instance, with promisified methods for the files namespace
   */
  const setService2 = function (google_auth2, callback) {
    return Promise.try(function () {
      let service2 = google.drive({
        version: 'v3',
        auth: google_auth2
      });

      return service2;
    }).then(async (service2) => {
      _this.service2.files = Promise.promisifyAll(service2.files);

      if (typeof callback === 'function') {
        return await callback();
      }

      return _this.service2;
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
   * @param {google.auth.OAuth2} google_auth2
   * @param {function} callback 
   * 
   * @return {Promise} a promise (setService) that returns service property of this instance with promisified methods
   */
  const renewJwtAuth = function (google_auth2, callback) {
    debug('trying to renewJwtAuth'.cyan);
    return new Promise(function (resolve, reject) {
      google_auth2.authorize(function (err, token) {
        if (err) {
          reject(err);
        }
        resolve(setService2(google_auth2, callback));
      });
    });
  };

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
      let google_auth2 = new auth_client2.JWT(
        credsObj.client_email,
        null,
        credsObj.private_key,
        _this.options.GOOGLE_AUTH_SCOPE,
        null
      );
      return renewJwtAuth(google_auth2, callback);
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
  _this.useAuthToken = function (token, cb) { };

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

/**
 * List files (optionally, start from the specified folder, if set)
 * @see https://developers.google.com/drive/v3/reference/files/list
 * @see https://developers.google.com/drive/v3/reference/files#resource
 *
 * @param  {string}  parentFolder    - id of the folder from which to search.
 *                                   Defaults to the ROOT_FOLDER passed in the
 *                                   options
 * @param  {string}  pageToken       - the page token of a previous request,
 *                                   when the prior result is paginated
 * @param  {string}  recursive       - wether to list also files in subfolders
 *                                   of the requested parentFolder. defaults to
 *                                   true. If false, omits the files under
 *                                   subfolders. Works only when parentFolder is
 *                                   explicitly set
 * @param  {boolean}  includeRemoved  Either to include removed files in the
 *                                   listing. Defaults to false
 * @param  {string}  fields          - the partial fields that should be selected
 * @return {Array<google.drive.files#resource>}   array of file resources results
 */
GmailSandbox.prototype.listFiles = function (params) {
  let { parentFolder, pageToken, recursive = true, includeRemoved, fields, gDrivePrefix, listFolders } = params || {};
  var _this = this;
  var folderId = parentFolder || _this.options.ROOT_FOLDER;
  var request = {
    includeRemoved: !!includeRemoved,
    spaces: 'drive',
    pageSize: 100,
    fields:
      fields ||
      'nextPageToken, files(id, name, parents, mimeType, modifiedTime)'
  };

  // If pageToken is set, then request the next page of file list
  if (pageToken) {
    request.pageToken = pageToken;
  }

  // If parent folder is set, list files under that folder
  if (folderId !== null) {
    request.fileId = folderId;

    // If recursive is explicitly set to false, the limit the list to files that have
    // the given parent folder as parent
    if (recursive === false) {
      request.q = `'${parentFolder}' in parents`;
    }
  }

  return _this.service2.files
    .listAsync(request)
    .then((response) => {
      if (response.data && response.data.files && Array.isArray(response.data.files)) {
        debug('Found %s files on folder %s'.cyan, response.data.files.length, folderId);
        response.data.parentFolder = folderId;
      } else {
        response.data = [];
      }

      if (!gDrivePrefix) {
        return response.data;
      }

      let folders = _.filter(response.data.files, function (file) {
        return file.mimeType === 'application/vnd.google-apps.folder';
      });
      response.data.folders = (folders && folders.length) > 0 ? folders : [];

      const foundFolder = response.data.folders.find(({ name }) => name === gDrivePrefix.split(/[\\\/]/).slice(-1).join('/'));
      if (!listFolders && foundFolder && Object.keys(foundFolder).length) {
        return _this.listFiles({ 'parentFolder': foundFolder.id, 'pageToken': null, 'recursive': false })
      }

      return _.omit(response.data, ['files']);
    })
    .catch(function (err) {
      debug('Error listing files ', err.message);
      throw err;
    });
};

module.exports = GmailSandbox;
