function print(...args) {
  console.log(...args);
}
var vm = require('vm');
var $262 = {
  global: Function('return this')(),
  gc() {
    return gc();
  },
  createRealm(options) {
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
  evalScript(code) {
    const displayErrors = false;
    try {
      if (this.context) {
        vm.runInContext(code, this.context, {displayErrors});
      } else {
        vm.runInESHostContext(code, {displayErrors});
      }

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
  source: $SOURCE
};


