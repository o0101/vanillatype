  const BuiltIns = [Symbol, Boolean, Number, String, Object, Array, Set, Map, WeakMap, WeakSet,
                    Uint8Array, Uint16Array, Uint32Array, Float32Array, Float64Array,
                    Int8Array, Int16Array, Int32Array, 
                    Uint8ClampedArray];
  const typeCache = new Map();

  mapBuiltins();

  Object.assign(T, {check, verify, def, defCollection, option, or, guard, errors});

  export function T(parts, ...vals) {
    parts = [...parts];
    vals = [...vals];
    const typeName = parts[0];
    if ( !typeCache.has(typeName) ) throw {error:`Cannot use type ${typeName} before it is defined.`};
    return new Type(typeName);
  }

  function check(typeName, instance) {

  }

  function option(type) {

  }
  function verify(...args) { return check(...args); }

  function defCollection(name, {container, member}) {
    if ( !name ) throw {error:`Type must be named.`}; 
    if ( !container || !member ) throw {error:`Type must be specified.`};
    spec.kind = 'defCollection';
    const spec = {container, member};
    typeCache.set(name, spec);
    return new Type(name);
  }

  function Type(name, mods = {}) {
    if ( ! new.target ) throw {error:`Type with new only.`};
    Object.defineProperty(this,'name', {get: () => name});
    this.typeName = name;
  }

  Type.prototype.toString = function () {
    return `${this.name} Type`;
  };

  function def(name, spec) {
    if ( !name ) throw {error:`Type must be named.`}; 
    if ( !spec ) throw {error:`Type must be specified.`};
    spec.kind = 'def';
    typeCache.set(name, spec);
    return new Type(name);
  }

  function or(...types) {

  }

  function guard(typeName, instance) {
    if ( ! verify(typeName, instance) ) throw {error: `Type ${typeName} requested, but item is not of that type.`};
  }

  function errors(typeName, instance) {

  }

  function mapBuiltins() {
    BuiltIns.forEach(t => (console.log(t,t.name),def(t.name, {verify: i => i.constructor.name === name})));  
    console.log(typeCache);
  }

