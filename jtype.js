  const BuiltIns = [Symbol, Boolean, Number, String, Object, Array, Set, Map, WeakMap, WeakSet,
                    Uint8Array, Uint16Array, Uint32Array, Float32Array, Float64Array,
                    Int8Array, Int16Array, Int32Array, 
                    Uint8ClampedArray];
  const typeCache = new Map();

  mapBuiltins();

  Object.assign(T, {check, verify, validate, def, defCollection, option, or, guard, errors});

  Object.assign(self, {typeCache});

  export function T(parts, ...vals) {
    parts = [...parts];
    vals = [...vals];
    const typeName = parts[0];
    if ( !typeCache.has(typeName) ) throw {error:`Cannot use type ${typeName} before it is defined.`};
    return new Type(typeName);
  }

  function validate(type, instance) {
    let typeName = type;
    if (type instanceof Type) {
      typeName = type.name;
    }

    const {spec,kind,verify} = typeCache.get(typeName);
    if ( ! kind ) throw { error: `No such type defined: ${typeName}` };

    const bigErrors = [];

    switch(kind) {
      case "def":
        let allValid = true;
        if ( !! spec ) {
          const keyPaths = Object.keys(spec);
          allValid = keyPaths.every(kp => {
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
      default: {
        throw {error: `Checking for type kind ${kind} is not yet implemented.`}
      }
    }
  }

  function check(...args) {
    return validate(...args).valid;
  }

  function lookup(obj, keyPath) {
    if ( !obj ) throw {error:`Lookup requires a non-unset object.`};

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

  }
  function verify(...args) { return check(...args); }

  function defCollection(name, {container, member}) {
    if ( !name ) throw {error:`Type must be named.`}; 
    if ( !container || !member ) throw {error:`Type must be specified.`};
    const kind = 'defCollection';
    const spec = {kind, spec: { container, member}};
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

    const kind = 'def';
    typeCache.set(name, {spec,kind,verify});
    return new Type(name);
  }

  function or(...types) {

  }

  function guard(typeName, instance) {
    if ( ! verify(typeName, instance) ) throw {error: `Type ${typeName} requested, but item is not of that type.`};
  }

  function errors(...args) {
    return validate(...args).errors;
  }

  function mapBuiltins() {
    BuiltIns.forEach(t => def(t.name, null, {verify: i => i.constructor.name === t.name}));  
  }

