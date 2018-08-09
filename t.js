
  export const BROWSER_SIDE      = (() => {try{ return self.DOMParser && true; } catch(e) { return false; }})();

  const BuiltIns = [
    Symbol, Boolean, Number, String, Object, Set, Map, WeakMap, WeakSet,
    Uint8Array, Uint16Array, Uint32Array, Float32Array, Float64Array,
    Int8Array, Int16Array, Int32Array, 
    Uint8ClampedArray, 
    ...(BROWSER_SIDE ? [
      Node,NodeList,Element,HTMLElement, Blob, ArrayBuffer,
      FileList, Text, Document, DocumentFragment,
      Error, File, Event, EventTarget, URL
    ] : [ Buffer ])
  ];

  const isNone = instance => instance == null || instance == undefined;

  const typeCache = new Map();

  Object.assign(T, {check, sub, verify, validate, def, defSub, defTuple, defCollection, defOr, option, defOption, or, guard, errors});

  defineSpecials();
  mapBuiltins();

  export function T(parts, ...vals) {
    const cooked = vals.reduce((prev,cur,i) => prev+cur+parts[i+1], parts[0]);
    const typeName = cooked;
    if ( !typeCache.has(typeName) ) throw {error:`Cannot use type ${typeName} before it is defined.`};
    return new Type(typeName);
  }

  function validate(type, instance) {
    guardType(type);
    guardExists(type);
    let typeName = type.name;

    const {spec,kind,verify} = typeCache.get(typeName);

    const bigErrors = [];

    switch(kind) {
      case "def": 
        let allValid = true;
        if ( !! spec ) {
          const keyPaths = Object.keys(spec);
          allValid = !isNone(instance) && keyPaths.every(kp => {
            const {resolved, errors:lookupErrors} = lookup(instance,kp);
            bigErrors.push(...lookupErrors);
            if ( lookupErrors.length ) return false;
            const {valid, errors: validationErrors} = validate(spec[kp], resolved);
            bigErrors.push(...validationErrors);
            return valid;
          });
        }
        let verified = true;
        if ( !!verify ) {
          try {
            verified = verify(instance);
          } catch(e) {
            bigErrors.push(e);
          }
        }
        return {valid: allValid && verified, errors: bigErrors}
      case "defCollection":
        const {valid:containerValid, errors:containerErrors} = validate(spec.container, instance);
        bigErrors.push(...containerErrors);
        let membersValid = true;
        if ( containerValid ) {
           membersValid= [...instance].every(member => {
            const {valid, errors} = validate(spec.member, member);
            bigErrors.push(...errors);
            return valid;
          });
        }
        return {valid:containerValid && membersValid, errors:bigErrors};
      default: {
        throw {error: `Checking for type kind ${kind} is not yet implemented.`}
      }
    }
  }

  function check(...args) {
    return validate(...args).valid;
  }

  function lookup(obj, keyPath) {
    if ( isNone(obj) ) throw {error:`Lookup requires a non-unset object.`};

    if ( !keyPath ) throw {error: `keyPath must not be empty`};

    const keys = keyPath.split(/\./g);
    const pathComplete = [];
    const errors = [];

    let resolved = obj;

    while(keys.length) {
      const nextKey = keys.shift();
      resolved = resolved[nextKey];
      pathComplete.push(nextKey);
      if ( keys.length && resolved == null || resolved == undefined ) {
        errors.push( { error: `Lookup on key path ${keyPath} failed at ${pathComplete.join('.')}
          when null or undefined was found.` });
        break;
      }
    }
    return {resolved,errors};
  }

  function option(type) {
    return T`?${type.name}`;
  }

  function sub(type) {
    return T`>${type.name}`;
  }

  function defSub(type, spec, {verify} = {}) {
    guardType(type);
    guardExists(type);
    return def(`>${type.name}`, spec, {verify});
  }

  function exists(name) {
    return typeCache.has(name);
  }

  function guardRedefinition(name) {
    if ( exists(name) ) throw {error: `Type ${name} cannot be redefined.`};
  }

  function defOption(type) {
    guardType(type);
    const typeName = type.name;
    return T.def(`?${typeName}`, null, {verify: i => isUnset(i) || T.check(type,i)});
  }

  function verify(...args) { return check(...args); }

  function defCollection(name, {container, member}) {
    if ( !name ) throw {error:`Type must be named.`}; 
    if ( !container || !member ) throw {error:`Type must be specified.`};
    guardRedefinition(name);

    const kind = 'defCollection';
    const spec = {kind, spec: { container, member}};
    typeCache.set(name, spec);
    return new Type(name);
  }

  function defTuple(name, {pattern}) {
    if ( !name ) throw {error:`Type must be named.`}; 
    if ( !pattern ) throw {error:`Type must be specified.`};
    const kind = 'def';
    const specObj = {};
    pattern.forEach((type,key) => specObj[key] = type);
    const spec = {kind, spec: specObj};
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

  function def(name, spec, {verify} = {}) {
    if ( !name ) throw {error:`Type must be named.`}; 
    guardRedefinition(name);

    const kind = 'def';
    typeCache.set(name, {spec,kind,verify});
    return new Type(name);
  }

  function or(...types) { // anonymous standin for defOr
    // could we do this with `name|name2|...` etc ?  we have to sort names so probably can
    throw {error: `Or is not implemented yet.`};
  }

  function defOr(name, ...types) {
    return T.def(name, null, {verify: i => types.some(t => check(t,i))});
  }

  function guard(type, instance) {
    guardType(type);
    guardExists(type);
    if ( ! verify(type, instance) ) throw {error: `Type ${typeName} requested, but item is not of that type.`};
  }

  function guardType(t) {
    if ( !(t instanceof Type) ) throw {error: `Type must be a valid Type object.`};
  }

  function guardExists(t) {
    if ( ! exists(t.name) ) throw {error:`Type must exist. Type ${t.name} has not been defined.`};
  }

  function errors(...args) {
    return validate(...args).errors;
  }

  function mapBuiltins() {
    BuiltIns.forEach(t => def(t.name, null, {verify: i => i.constructor.name === t.name}));  
    BuiltIns.forEach(t => defSub(T`${t.name}`, null, {verify: i => i instanceof t}));  
  }

  function defineSpecials() {
    T.def(`Any`, null, {verify: i => true});
    T.def(`Some`, null, {verify: i => !isUnset(i)});
    T.def(`None`, null, {verify: i => isUnset(i)});
    T.def(`Function`, null, {verify: i => i instanceof Function});
    T.def(`Integer`, null, {verify: i => Number.isInteger(i)});
    T.def(`Array`, null, {verify: i => Array.isArray(i)});
    T.def(`Iterable`, null, {verify: i => i[Symbol.iterator] instanceof Function});
  }

  function isUnset(i) {
    return i === null || i === undefined;
  }

