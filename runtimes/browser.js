(function() {
'use strict';

// The global $262 binding will be removed if the `shortName` option is in use.
// Maintain a function-scoped binding for internal use.
var $262 = window.$262 = {
  global: this,
  // Because the source text of this file is used as the "replaceValue" of
  // `String.prototype.replace`, care must be taken to avoid character
  // sequences which have special meaning in that context (notably the "dollar
  // sign" character followed immediately by the "single quotation mark"
  // character).
  shortName: '$262 '.slice(0, 4),
  createRealm(options) {
    options = options || {};
    const globals = options.globals || {};

    var frame = document.createElement('iframe');
    document.body.appendChild(frame);
    var fwin = frame.contentWindow;
    var fdoc = fwin.document;
    var fscript = fdoc.createElement('script');

    // The following is a workaround for a bug in Chromium related to reporting
    // errors produced from evaluating code using `eval`.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=746564
    fdoc.write('<body>');

    fscript.textContent = this.source;
    fdoc.body.appendChild(fscript);
    var f$262 = fwin.$262;
    delete fwin.$262;
    fwin[$262.shortName] = f$262;
    f$262.source = this.source;
    f$262.socket = this.socket;

    for(var glob in globals) {
      fwin[glob] = globals[glob];
    }

    f$262.destroy = function () {
      document.body.removeChild(frame);

      if (options.destroy) {
        options.destroy();
      }
    };

    return f$262;
  },
  evalScript(code, options) {
    options = options || {};

    var s = document.createElement('script');
    s.textContent = code;
    var error = null;
    window.onerror = function(message, file, row, col, err) {
      if (!err) {
        // make up some error for Edge.
        err = {
          name: 'Error',
          message
        };
      }

      error = err;
    }
    document.body.appendChild(s);
    if (window) {
      window.onerror = null;
    }

    if (error) {
      return { type: 'throw', value: error };
    } else {
      return { type: 'normal', value: undefined };
    }
  },
  getGlobal(name) {
    return this.global[name];
  },
  setGlobal(name, value) {
    this.global[name] = value;
  },
  destroy() {
    $262.socket.emit('destroy')
  },
  IsHTMLDDA: document.all,
  source: $SOURCE
};

function print(value) {
  // If the `undefined` value is emitted directly, Socket.io will transmit the
  // `null` value in its place, invalidating the reported output. Emit the
  // value as a property of an ordinary object to avoid this behavior.
  $262.socket.emit('print', {value});
}

window.print = print;
}.call(this));
