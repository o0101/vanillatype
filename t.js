
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
  
  T[Symbol.for('jtype-system.typeCache')] = typeCache;

  defineSpecials();
  mapBuiltins();

  export function T(parts, ...vals) {
    const cooked = vals.reduce((prev,cur,i) => prev+cur+parts[i+1], parts[0]);
    const typeName = cooked;
    if ( !typeCache.has(typeName) ) throw new TypeError(`Cannot use type ${typeName} before it is defined.`);
    return new Type(typeName);
  }

  function validate(type, instance) {
    guardType(type);
    guardExists(type);
    let typeName = type.name;

    const {spec,kind,verify,sealed} = typeCache.get(typeName);

    const bigErrors = [];

    switch(kind) {
      case "def": {
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
            verified = false;
          }
        }
        let sealValid = true;
        if ( !!sealed ) {
          const all_key_paths = allKeyPaths(instance).sort().join(',');
          const type_key_paths = Object.keys(spec).sort().join(',');
          sealValid  = all_key_paths == type_key_paths;
        }
        return {valid: allValid && verified && sealValid, errors: bigErrors}
      } case "defCollection": {
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
        let verified = true;
        if ( !!verify ) {
          try {
            verified = verify(instance);
          } catch(e) {
            bigErrors.push(e);
            verified = false;
          }
        }
        return {valid:containerValid && membersValid && verified, errors:bigErrors};
      } default: {
        throw new TypeError(`Checking for type kind ${kind} is not yet implemented.`);
      }
    }
  }

  function check(...args) {
    return validate(...args).valid;
  }

  function lookup(obj, keyPath) {
    if ( isNone(obj) ) throw new TypeError(`Lookup requires a non-unset object.`);

    if ( !keyPath ) throw new TypeError(`keyPath must not be empty`);


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
    if ( exists(name) ) throw new TypeError(`Type ${name} cannot be redefined.`);
  }

  function allKeyPaths(o) {
    const keyPaths = new Set();
    return recurseObject(o, keyPaths);

    // how to do this?
    // notes:
      // i think we ignore any array properties for now, since unless we had some
      // notion of 'fixed size' (which we could do via a collection type verify function)
      // arrays can be dynamicly sized, so taking the indices as keys is not
      // easily expressible in a representation of a type definition that we can check against
      // so we only care about key names and object properties. 
      // we need a stack. Or a recursive function, that takes a set as an argument
      // also we ignore keys inherited from prototypes so this is also another limitation
      // but probably also a desirable feature of this implementation // notion of sealed
      // since that means that instead of having to worry about a possibly unbounded definition
      // of other key paths inherited through prototypes of other types
      // sealed only applies to checking the properties on this object that are set on itself. 

    function recurseObject(o, keyPathSet, lastLevel = '') {
      const levelKeys = Object.getOwnPropertyNames(o); 
      const levelKeyPaths = levelKeys.map( k => lastLevel + k );
      levelKeyPaths.forEach(kp => keyPathSet.add(kp));
      for ( const k of levelKeys ) {
        const v = o[k];
        if ( typeof v == "object" && ! Array.isArray(v) ) {
          recurseObject(v, lastLevel+k, keyPathSet);
        }
      }
      return [...keyPathSet];
    }
  }

  function defOption(type) {
    guardType(type);
    const typeName = type.name;
    return T.def(`?${typeName}`, null, {verify: i => isUnset(i) || T.check(type,i)});
  }

  function verify(...args) { return check(...args); }

  function defCollection(name, {container, member}, {sealed,verify} = {}) {
    if ( !name ) throw new TypeError(`Type must be named.`); 
    if ( !container || !member ) throw new TypeError(`Type must be specified.`);
    guardRedefinition(name);

    const kind = 'defCollection';
    const spec = {kind, spec: { container, member}, verify, sealed};
    typeCache.set(name, spec);
    return new Type(name);
  }

  function defTuple(name, {pattern}) {
    if ( !name ) throw new TypeError(`Type must be named.`); 
    if ( !pattern ) throw new TypeError(`Type must be specified.`);
    const kind = 'def';
    const specObj = {};
    pattern.forEach((type,key) => specObj[key] = type);
    const spec = {kind, spec: specObj};
    typeCache.set(name, spec);
    return new Type(name);
  }

  function Type(name, mods = {}) {
    if ( ! new.target ) throw new TypeError(`Type with new only.`);
    Object.defineProperty(this,'name', {get: () => name});
    this.typeName = name;
  }

  Type.prototype.toString = function () {
    return `${this.name} Type`;
  };

  function def(name, spec, {verify, sealed} = {}) {
    if ( !name ) throw new TypeError(`Type must be named.`); 
    guardRedefinition(name);

    const kind = 'def';
    typeCache.set(name, {spec,kind,verify, sealed});
    return new Type(name);
  }

  function or(...types) { // anonymous standin for defOr
    // could we do this with `name|name2|...` etc ?  we have to sort names so probably can
    throw new TypeError(`Or is not implemented yet.`);
  }

  function defOr(name, ...types) {
    return T.def(name, null, {verify: i => types.some(t => check(t,i))});
  }

  function guard(type, instance) {
    guardType(type);
    guardExists(type);
    const {valid, errors} = validate(type, instance);
    if ( ! valid ) throw new TypeError(`Type ${type} requested, but item is not of that type: ${errors.join(', ')}`);
  }

  function guardType(t) {
    if ( !(t instanceof Type) ) throw new TypeError(`Type must be a valid Type object.`);
  }

  function guardExists(t) {
    const name = originalName(t);
    if ( ! exists(name) ) throw new TypeError(`Type must exist. Type ${name} has not been defined.`);
  }

  function errors(...args) {
    return validate(...args).errors;
  }

  function mapBuiltins() {
    BuiltIns.forEach(t => def(originalName(t), null, {verify: i => originalName(i.constructor) === originalName(t)}));  
    BuiltIns.forEach(t => defSub(T`${originalName(t)}`, null, {verify: i => i instanceof t}));  
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

  function originalName(t) {
    if (!!t && t.name) {
      return t.name;
    } 
    const oName = Object.prototype.toString.call(t).replace(/\[object |\]/g, '');
    if ( oName.endsWith('Constructor') ) {
      return oName.replace(/Constructor$/,'');
    }
    return oName;
  }

