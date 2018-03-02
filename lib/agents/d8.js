'use strict';

const fs = require('fs');
const runtimePath = require('../runtimePath');
const ConsoleAgent = require('../ConsoleAgent');
const ErrorParser = require('../parseError.js');

const errorRe = /(.*?):(\d+): (([\w\d]+)(?:: (.*))?)[\w\W]*(\3((:?\s+at.*\r?\n)*)(\r?\n)+)?$/;

class D8Agent extends ConsoleAgent {
  parseError(str) {
    const match = str.match(errorRe);
    if(!match) {
      return null;
    }
    const stackStr = match[6] || '';

    let stack;
    if (stackStr.trim().length > 0) {
      stack = ErrorParser.parseStack(stackStr);
    } else {
      stack = [{
        source: match[0],
        fileName: match[1],
        lineNumber: match[2]
      }]
    }

    return {
      name: match[4],
      message: match[5],
      stack: stack
    }
  }

  normalizeResult(result) {
    const match = result.stdout.match(errorRe);

    if (match) {
      result.stdout = result.stdout.replace(errorRe, '');
      result.stderr = match[0];
    }

    return result;
  }
}

D8Agent.runtime = fs.readFileSync(runtimePath.for('d8'), 'utf8');

module.exports = D8Agent;
