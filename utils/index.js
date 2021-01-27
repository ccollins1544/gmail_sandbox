"use strict";

const fs = require("fs");
const path = require("path");
let basename = path.basename(module.filename);
let utils = {};

fs.readdirSync(__dirname)
  .filter(function (file) {
    return (
      file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
    );
  })
  .forEach(function (file) {
    let f = require(path.join(__dirname, file));
    utils = {
      ...utils,
      ...f
    };
  });

module.exports = utils;