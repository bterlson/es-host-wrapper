var $262 = {
  global: typeof globalThis !== 'undefined' ? globalThis : Function('return this')(),
  gc() {
    if (typeof CollectGarbage === 'function') {
      return CollectGarbage();
    } else {
      throw new Test262Error('gc() not yet supported.');
    }
  },
  createRealm(options) {
    options = options || {};
    options.globals = options.globals || {};

    var realm = WScript.LoadScript(this.source, 'samethread');
    realm.$262.source = this.source;
    realm.$262.destroy = function() {
      if (options.destroy) {
        options.destroy();
      }
    };

    for(var glob in options.globals) {
      realm.$262.global[glob] = options.globals[glob];
    }

    return realm.$262;
  },
  evalScript(code) {
    try {
      WScript.LoadScript(code);
      return { type: 'normal', value: undefined };
    } catch (e) {
      return { type: 'throw', value: e };
    }
  },
  getGlobal(name) {
    return this.global[name];
  },
  setGlobal(name, value) {
    this.global[name] = value;
  },
  destroy() { /* noop */ },
  IsHTMLDDA: {},
  source: $SOURCE,
  agent: (function() {
    const isAgentSupportable = WScript.Broadcast && WScript.ReceiveBroadcast &&
                                WScript.Sleep && WScript.Leaving &&
                                WScript.Report && WScript.GetReport;

    function thrower() {
      throw new Test262Error('agent.* not yet supported.');
    }

    // Date.now() is an invalid substitute for monotonicNow,
    // but until WScript exposes the function we need, Date.now()
    // is the closest thing available.

    if (isAgentSupportable) {
      return {
        start(src) {

          const source = `
          var $262 = {
            agent: {
              receiveBroadcast(callback) { WScript.ReceiveBroadcast(callback); },
              report(value) { WScript.Report(value); },
              sleep(timeout) { WScript.Sleep(timeout); },
              monotonicNow() { return Date.now(); },
              leaving() { WScript.Leaving(); },
            },
          };
          ${src}
          `.trim();

          WScript.LoadScript(source, 'crossthread');
        },
        broadcast(sab) { WScript.Broadcast(sab); },
        getReport() { return WScript.GetReport(); },
        sleep(timeout) { WScript.Sleep(timeout); },
        leaving() { WScript.Leaving(); },
        monotonicNow() { return Date.now(); },
      };
    } else {
      return {
        start: thrower,
        broadcast: thrower,
        getReport: thrower,
        sleep: thrower,
        monotonicNow: thrower,
      };
    }
  })(),
};
