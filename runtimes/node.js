function print() {
  console.log.apply(console, arguments);
}
var vm = require('vm');
var $262 = {
  global: Function('return this')(),
  gc: function() {
    return gc();
  },
  createRealm: function createRealm(options) {
    options = options || {};
    options.globals = options.globals || {};

    context = {
      console,
      require,
      print,
    };

    for(var glob in options.globals) {
       context[glob] = options.globals[glob];
    }

    var context = vm.createContext(context);
    vm.runInContext(this.source, context);
    context.$262.source = this.source;
    context.$262.context = context;
    context.$262.destroy = function () {
      if (options.destroy) {
        options.destroy();
      }
    };
    return context.$262;
  },
  evalScript: function evalScript(code) {
    try {
      if (this.context) {
        vm.runInContext(code, this.context, {displayErrors: false});
      } else {
        vm.runInESHostContext(code, {displayErrors: false});
      }

      return { type: 'normal', value: undefined };
    } catch (e) {
      return { type: 'throw', value: e };
    }
  },
  getGlobal: function getGlobal(name) {
    return this.global[name];
  },
  setGlobal: function setGlobal(name, value) {
    this.global[name] = value;
  },
  destroy: function destroy() { /* noop */ },
  IsHTMLDDA: function IsHTMLDDA() { return {}; },
  source: $SOURCE
};


