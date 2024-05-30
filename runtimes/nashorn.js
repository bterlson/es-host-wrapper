var $262 = {
  global: Function('return this')(),
  gc() {
    throw new Test262Error('gc() not yet supported.');
  },
  createRealm: function(options) {
    options = options || {};
    options.globals = options.globals || {};

    var realm = loadWithNewGlobal({ script: 'this', name: 'createRealm' });
    realm.eval(this.source);
    realm.$262.source = this.source;
    realm.$262.destroy = function () {
      if (options.destroy) {
        options.destroy();
      }
    };

    for(var glob in options.globals) {
      realm.$262.global[glob] = options.globals[glob];
    }

    return realm.$262;
  },
  evalScript: function(code) {
    try {
      load({ script: code, name: 'evalScript' });
      return { type: 'normal', value: undefined }
    } catch (e) {
      return { type: 'throw', value: e }
    }
  },
  getGlobal: function(name) {
    return this.global[name];
  },
  setGlobal: function(name, value) {
    this.global[name] = value;
  },
  destroy: function() { /* noop */ },
  IsHTMLDDA: {},
  source: $SOURCE,
  agent: (function() {
    function thrower() {
      throw new Test262Error('agent.* not yet supported.');
    };
    return {
      start: thrower,
      broadcast: thrower,
      getReport: thrower,
      sleep: thrower,
      monotonicNow: thrower,
    };
  })(),
};
