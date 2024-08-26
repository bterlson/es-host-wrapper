'use strict';
const cp = require('child_process');
const fs = require('fs');
const path = require('path');
const recast = require('recast');
const uniqueTempDir = require('unique-temp-dir');

const Agent = require('./Agent');
const inception = require('./inception');
const writeSources = require('./write-sources');
const ErrorParser = require('./parse-error');
const {
  getDependencies,
  // escapeModuleSpecifier,
  hasModuleSpecifier,
  rawSource
} = require('./dependencies');

const {
  ChildProcess
} = cp;

const CHILD_PROCESS = Symbol.for('cp');
const TEMP_PATH = Symbol.for('tp');

function generateTempFileName() {
  const now = Date.now();
  return `f-${now}-${process.pid}-${(Math.random() * 0x100000000 + 1).toString(36)}.js`;
}

const ESHostErrorSource = `
function ESHostError(message) {
  this.message = message || "";
}
ESHostError.prototype.toString = function () {
  return "ESHostError: " + this.message;
};
ESHostError.thrower = (...args) => {
  throw new ESHostError(...args);
};
var $ERROR = ESHostError.thrower;
function $DONOTEVALUATE() {
  throw "ESHost: This statement should not be evaluated.";
}
`;

const isMissingTest262ErrorDefinition = header => {
  if (!header.includes('Test262Error')) {
    return false;
  }
  try {
    const f = new Function(`${header}; return typeof Test262Error == 'undefined';`);
    return f();
  } catch (error) {
    return false;
  }
};

const useESHostError = (code) => {
  return `${ESHostErrorSource}${code}`.replace(/Test262Error/gm, 'ESHostError');
};

class ConsoleAgent extends Agent {
  constructor(options) {
    super(options);

    this.isStopped = false;
    this.printCommand = 'print';
    this.cpOptions = {};
    // Promise for the child process created by the most
    // recent invocation of `evalScript`

    Object.defineProperties(this, {
      [CHILD_PROCESS]: {
        value: null,
        writable: true,
        enumerable: false
      },
      [TEMP_PATH]: {
        value: uniqueTempDir(),
        writable: true,
        enumerable: false
      }
    });
  }

  async createChildProcess(args = [], options = {}) {
    this.hasFinishedCreatingChildProcess = false;

    if (this.isStopped) {
      return null;
    }
    try {
      return cp.spawn(
        this.hostPath,
        this.args.concat(args),
        {
          ...this.cpOptions,
          ...options,
          detached: true
        }
      );
    } catch (error) {
      return this.createChildProcess(args, options);
    }
  }

  async evalScript(code, options = {}) {
    this.isStopped = false;

    let tempfile = path.join(this[TEMP_PATH], generateTempFileName());
    let temppath = this[TEMP_PATH];

    let isExpectingRawSource = false;
    let hasDependencies = false;

    const sources = [];
    const dependencies = [];

    if (this.out) {
      tempfile = tempfile.replace(temppath, this.out);
      temppath = this.out;
    }

    // When evalScript is called with a test262-stream test record:
    if (typeof code === 'object' && code.contents) {
      let {attrs, contents, file} = code;

      isExpectingRawSource = !!attrs.flags.raw;

      let { phase = '', type = '' } = attrs.negative || {};
      let isEarlySyntaxError = (phase === 'early' || phase === 'parse') && type === 'SyntaxError';
      let sourcebase = path.basename(file);

      // If the main test file isn't a negative: SyntaxError,
      // then we can proceed with checking for importable files
      if (!isEarlySyntaxError) {
        dependencies.push(...getDependencies(file, [sourcebase]));
        hasDependencies = dependencies.length > 0;
      }

      if (dependencies.length === 1 && dependencies[0] === sourcebase) {
        dependencies.length = 0;
        hasDependencies = false;
      }

      if (options.module || attrs.flags.module ||
          hasModuleSpecifier(contents)) {
        // When testing module or dynamic import code that imports itself,
        // we must copy the test file with its actual name.
        tempfile = path.join(temppath, sourcebase);
      }

      // The test record in "code" is no longer needed and
      // all further operations expect the "code" argument to be
      // a string, make that true for back-compat.
      code = contents;
    }

    // If test record explicitly indicates that this test should be
    // treated as raw source only, then it does not need to be
    // further "compiled".
    if (!isExpectingRawSource) {
      code = this.compile(code);
    }

    // Add the entry point source to the list of source to create.
    //
    //  "tempfile" will be either:
    //
    //    - A generated temporary file name, if evalScript received
    //      raw source code.
    //    - The file name of the test being executed, but within
    //      the os's temporary file directory
    sources.push([ tempfile, code ]);

    // If any dependencies were discovered, there will be
    if (hasDependencies) {
      // Prepare dependencies for use:
      //
      // 1. Make an absolute path for the dependency file.
      // 2. Get the dependency's source from the rawSource cache
      // 3. Push the dependency and source into the sources to be written.
      //
      dependencies.forEach(file => {
        let absname = path.join(temppath, file);
        let depsource = rawSource.get(path.basename(file));

        // Sometimes a test file might want to import itself,
        // which is a valid exercise of the import semantics.
        // Here we avoid adding the test file more than once.
        if (absname !== tempfile) {
          sources.push([
            absname,
            depsource
          ]);
        }
      });
    }

    await writeSources(sources);

    let stdout = '';
    let stderr = '';
    let error = null;

    if (this.isStopped) {
      return {
        stderr,
        stdout,
        error
      };
    }

    this[CHILD_PROCESS] = await this.createChildProcess([...options.testHostArgs || [], tempfile]);
    this.hasFinishedCreatingChildProcess = true;

    if (this.isStopped && this[CHILD_PROCESS] === null) {
      return {
        stderr,
        stdout,
        error
      };
    }

    this[CHILD_PROCESS].stdout.on('data', str => { stdout += str; });
    this[CHILD_PROCESS].stderr.on('data', str => { stderr += str; });

    await new Promise(resolve => {
      this[CHILD_PROCESS].on('close', (code, signal) => {
        if (signal && signal !== 'SIGKILL') {
          stderr += `\nError: Received unexpected signal: ${signal}`;
        }
        resolve();
      });
    });

    sources.forEach(({0: file}) => fs.unlink(file, () => { /* ignore */ }));

    // try {
    //   process.kill(this[CHILD_PROCESS].pid + 1);
    // } catch (error) {}

    const result = this.normalizeResult({ stderr, stdout });
    result.error = this.parseError(result.stderr);

    return result;
  }

  stop() {
    let stoppedAnActiveChildProcess = false;
    this.isStopped = true;

    // This must be sync
    if (this.hasFinishedCreatingChildProcess && this[CHILD_PROCESS] instanceof ChildProcess) {
      this[CHILD_PROCESS].stdin.end();
      this[CHILD_PROCESS].stdout.destroy();
      this[CHILD_PROCESS].stderr.destroy();
      this[CHILD_PROCESS].kill('SIGKILL');
      stoppedAnActiveChildProcess = true;
    }

    // killing is fast, don't bother waiting for it
    return Promise.resolve(stoppedAnActiveChildProcess);
  }

  // console agents need to kill the process before exiting.
  async destroy() {
    return this.stop();
  }

  compile(code, options) {
    code = super.compile(code, options);
    let runtime = this.constructor.runtime;
    let { options: hostOptions } = this;

    if (runtime) {
      let ast = recast.parse(runtime);

      recast.visit(ast, {
        visitNode(node) {
          // Remove comments from runtime source
          if (node.value.comments) {
            node.value.comments.length = 0;
          }

          if (hostOptions.shortName) {
            // Replace $ in runtime source
            if (node.value.type === 'Identifier' &&
                node.value.name === '$262') {
              node.value.name = hostOptions.shortName;
            }
          }

          this.traverse(node);
        }
      });

      runtime = recast.print(ast).code;
    }

    runtime = inception(runtime.replace(/\r?\n/g, '').replace(/\s+/gm, ' '));

    if (!runtime) {
      return code;
    } else {
      const prologue = code.match(/^("[^\r\n"]*"|'[^\r\n']*'|[\s\r\n;]*|\/\*[\w\W]*?\*\/|\/\/[^\n]*\n)*/);
      const header = prologue
        ? prologue[0] + runtime
        : runtime;

      const body = prologue
        ? code.slice(prologue[0].length)
        : code;

      const compiledCode = `${header}${body}`;

      if (isMissingTest262ErrorDefinition(header)) {
        return useESHostError(compiledCode);
      }

      return compiledCode;
    }
  }

  // Normalizes raw output from a console host. Default is no normalization.
  normalizeResult(result) { return result; }

  parseError(str) {
    return ErrorParser.parse(str);
  }
}

ConsoleAgent.runtime = `
  /* This is not the agent you're looking for */
  const name = 'ConsoleAgent';
`;

module.exports = ConsoleAgent;

