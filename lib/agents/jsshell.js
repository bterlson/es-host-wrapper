'use strict';

const fs = require('fs');
const runtimePath = require('../runtimePath');
const ConsoleAgent = require('../ConsoleAgent');

const errorRe = /^(.*?)?:(\d+):(\d+)? ([\w\d]+): (.+)?$/m;
const customErrorRe = /^(?:uncaught exception: |:)([\w\d]+): (.+)$/m;

class SMAgent extends ConsoleAgent {
  parseError(str) {
    const error = {};
    let match = str.match(errorRe);

    if (!match) {
      // try custom error
      let match = str.match(customErrorRe);

      if (!match) {
        return null;
      }

      error.name = match[1];
      error.message = match[2];
      error.stack = [];
      return error;
    }

    error.name = match[4];
    error.message = match[5];

    error.stack = [{
      source: match[0],
      fileName: match[1],
      lineNumber: match[2],
      columnNumber: match[3]
    }];

    return error;
  }
}
SMAgent.runtime = fs.readFileSync(runtimePath.for('sm'), 'utf8');

module.exports = SMAgent;
