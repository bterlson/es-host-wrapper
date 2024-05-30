// $262 object is provided, however the shortName options
// requires redefinition to prevent regeference error.
// (behind --experimental-options --js.test262-mode=true flags)
const graaljs = globalThis["\x24262"];
const DollarCreateRealm = graaljs.createRealm;
const DollarEvalScript = graaljs.evalScript;
const $262 = Object.assign({}, graaljs);

$262.global = globalThis;
$262.gc = function() {
  throw new Test262Error('gc() not yet supported.');
};
$262.getGlobal = function(name) {
  return this.global[name];
};
$262.setGlobal = function(name, value) {
  this.global[name] = value;
};
$262.destroy = function () { /* noop */ };
$262.IsHTMLDDA = {};
$262.source = $SOURCE;

$262.evalScript = function(code) {
  try {
    DollarEvalScript(code);
    return { type: 'normal', value: undefined };
  } catch (e) {
    return { type: 'throw', value: e };
  }
};
$262.createRealm = function (options = {}) {
  const realm = DollarCreateRealm(options);
  realm.evalScript($262.source);
  realm.source = $262.source;
  realm.getGlobal = $262.getGlobal;
  realm.setGlobal = $262.setGlobal;
  realm.destroy = () => {
    if (options.destroy) {
      options.destroy();
    }
  };
  const globals = options.globals || {};
  for (let glob in globals) {
    realm.global[glob] = globals[glob];
  }
  return realm;
};