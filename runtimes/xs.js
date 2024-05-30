var $262 = globalThis.$262;

if (!$262) {
  $262 = {
    global: globalThis,
    createRealm() {
      throw new Test262Error('createRealm() not yet supported.');
    },
    evalScript(code) {
      try {
        global.evalScript(code);
        return { type: 'normal', value: undefined };
      } catch (e) {
        return { type: 'throw', value: e };
      }
    },
    gc() {
      throw new Test262Error('gc() not yet supported.');
    },
    getGlobal(name) {
      return global[name];
    },
    setGlobal(name, value) {
      global[name] = value;
    },
    agent: (function() {
      function thrower() {
        throw new Test262Error('agent.* not yet supported.');
      }
      return {
        start: thrower,
        broadcast: thrower,
        getReport: thrower,
        sleep: thrower,
        monotonicNow: thrower,
      };
    })(),
  };
}
$262.IsHTMLDDA = {};
$262.destroy = function() {};
$262.getGlobal = function(name) {
  return this.global[name];
};
$262.setGlobal = function(name, value) {
  this.global[name] = value;
};
$262.source = $SOURCE;
