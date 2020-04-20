
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

  Object.assign(T, {
    check, sub, verify, validate, 
    partialMatch,
    def, defSub, defTuple, defCollection, defOr, option, defOption, maybe, or, 
    guard, errors
  });
  
  T[Symbol.for('jtype-system.typeCache')] = typeCache;

  defineSpecials();
  mapBuiltins();

  export function T(parts, ...vals) {
    const cooked = vals.reduce((prev,cur,i) => prev+cur+parts[i+1], parts[0]);
    const typeName = cooked;
    if ( !typeCache.has(typeName) ) throw new TypeError(`Cannot use type ${typeName} before it is defined.`);
    return typeCache.get(typeName).type;
  }

  function partialMatch(type, instance) {
    return validate(type, instance, {partial:true});
  }

  function validate(type, instance, {partial: partial = false} = {}) {
    guardType(type);
    guardExists(type);
    let typeName = type.name;

    const {spec,kind,verify,verifiers,sealed,native} = typeCache.get(typeName);

    const bigErrors = [];

    switch(kind) {
      case "def": {
        let allValid = true;
        if ( !! spec ) {
          const keyPaths = allKeyPaths(spec);
          const strictness = partial ? 'some' : 'every';
          allValid = !isNone(instance) && keyPaths[strictness](kp => {
            // Allow lookup errors if the type match for the key path can include None
            const {resolved, errors:lookupErrors} = lookup(instance,kp,() => !checkTypeMatch(lookup(spec,kp).resolved, T`None`));
            bigErrors.push(...lookupErrors);
            if ( lookupErrors.length ) return false;
            const {valid, errors: validationErrors} = validate(lookup(spec,kp).resolved, resolved);
            bigErrors.push(...validationErrors);
            return valid;
          });
        }
        let verified = true;
        if ( partial && ! spec && !!verify ) {
          throw new TypeError(`Type checking with option 'partial' is not a valid option for types that` + 
            ` only use a verify function but have no spec`);
        } else if ( !!verify ) {
          try {
            verified = verify(instance);
            if ( ! verified ) {
              if ( verifiers ) {
                throw {
                  error:`Value '${instance}' violated at least 1 verify function in:\n${
                    verifiers.map(f => '\t'+f.toString()).join('\n')
                  }`
                };
              } else if ( type.isSumType ) {
                throw {
                  error: `Value '${instance}' did not match any of: ${[...type.types.keys()].map(t => t.name)}`
                }
              } else {
                throw {error:`Value '${instance}' violated verify function in: ${verify.toString()}`};
              }
            }
          } catch(e) {
            bigErrors.push(e);
            verified = false;
          }
        }
        let sealValid = true;
        if ( !!sealed && !! spec ) {
          const all_key_paths = allKeyPaths(instance).sort();
          const type_key_paths = allKeyPaths(spec).sort();
          sealValid  = all_key_paths.join(',') == type_key_paths.join(',');
          if ( ! sealValid ) {
            if ( partial && all_key_paths.length < type_key_paths.length ) {
              sealValid = true;
            } else {
              const errorKeys = [];
              const tkp = new Set(type_key_paths); 
              for( const k of all_key_paths ) {
                if ( ! tkp.has(k) ) {
                  errorKeys.push({
                    error: `Key path '${k}' is not in the spec for type ${typeName}`
                  });
                }
              }
              if ( errorKeys.length ) {
                bigErrors.push(...errorKeys);
              }
            }
          }
        }
        return {valid: allValid && verified && sealValid, errors: bigErrors, partial}
      } case "defCollection": {
        const {valid:containerValid, errors:containerErrors} = validate(spec.container, instance);
        let membersValid = true;
        let verified = true;

        bigErrors.push(...containerErrors);
        if ( partial ) {
          throw new TypeError(`Type checking with option 'partial' is not a valid option for Collection types`);
        } else {
          if ( containerValid ) {
             membersValid= [...instance].every(member => {
              const {valid, errors} = validate(spec.member, member);
              bigErrors.push(...errors);
              return valid;
            });
          }
          if ( !!verify ) {
            try {
              verified = verify(instance);
            } catch(e) {
              bigErrors.push(e);
              verified = false;
            }
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

  function lookup(obj, keyPath, cannotBeNone) {
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
      if ( (resolved === null || resolved === undefined) ) {
        if ( keys.length ) {
          errors.push({
            error: 
              `Lookup on key path '${keyPath}' failed at '` + 
              pathComplete.join('.') +
              `' when ${resolved} was found at '${nextKey}'.` 
          });
        } else if ( !!cannotBeNone && cannotBeNone() ) {
          errors.push({
            error: 
              `Resolution on key path '${keyPath}' failed` + 
              `when ${resolved} was found at '${nextKey}' and the Type of this` +
              `key's value cannot be None.`
          });
        }
        break;
      }
    }
    return {resolved,errors};
  }

  function checkTypeMatch(typeA, typeB) {
    guardType(typeA);
    guardExists(typeA);
    guardType(typeB);
    guardExists(typeB);

    if ( typeA === typeB ) {
      return true;
    } else if ( typeA.isSumType && typeA.types.has(typeB) ) {
      return true;
    } else if ( typeB.isSumType && typeB.types.has(typeA) ) {
      return true;
    } else if ( typeA.name.startsWith('?') && typeB == T`None` ) {
      return true;
    } else if ( typeB.name.startsWith('?') && typeA == T`None` ) {
      return true;
    }

    if ( typeA.name.startsWith('>') || typeB.name.startsWith('>') ) {
      //throw new Error(`Check type match has not been implemented for derived//sub types yet.`);

    }

    return false;
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

    if ( ! verify ) {
      verify = () => true;
    } 

    if ( type.native ) {
      spec.verifiers = [ verify ];
      verify = i => i instanceof type.native.constructor && verify(i);
      spec.verifiers.push(verify);
    }

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
    return recurseObject(o, keyPaths, '');

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
      const keyPaths = levelKeys
        .map(k => lastLevel + (lastLevel.length ? '.' : '') + k)
      levelKeys.forEach((k,i) => {
        const v = o[k];
        if ( v instanceof Type ) {
          keyPathSet.add(keyPaths[i]);
        } else if ( typeof v == "object" && ! Array.isArray(v) ) {
          recurseObject(v, keyPathSet, lastLevel + (lastLevel.length ? '.' : '') +k);
        } else {
          keyPathSet.add(keyPaths[i]);
        }
      });
      return [...keyPathSet];
    }
  }

  function defOption(type) {
    guardType(type);
    const typeName = type.name;
    return T.def(`?${typeName}`, null, {verify: i => isUnset(i) || T.check(type,i)});
  }

  function maybe(type) {
    try {
      return defOption(type);
    } catch(e) {
      // console.log(`Option Type ${type.name} already declared.`, e);
    }
    return T`?${type.name}`;
  }

  function verify(...args) { return check(...args); }

  function defCollection(name, {container, member}, {sealed,verify} = {}) {
    if ( !name ) throw new TypeError(`Type must be named.`); 
    if ( !container || !member ) throw new TypeError(`Type must be specified.`);
    guardRedefinition(name);

    const kind = 'defCollection';
    const t = new Type(name);
    const spec = {kind, spec: { container, member}, verify, sealed, type: t};
    typeCache.set(name, spec);
    return t;
  }

  function defTuple(name, {pattern}) {
    if ( !name ) throw new TypeError(`Type must be named.`); 
    if ( !pattern ) throw new TypeError(`Type must be specified.`);
    const kind = 'def';
    const specObj = {};
    pattern.forEach((type,key) => specObj[key] = type);
    const t = new Type(name);
    const spec = {kind, spec: specObj, type:t};
    typeCache.set(name, spec);
    return t;
  }

  function Type(name, mods = {}) {
    if ( ! new.target ) throw new TypeError(`Type with new only.`);
    Object.defineProperty(this,'name', {get: () => name});
    this.typeName = name;

    if ( mods.types ) {
      const {types} = mods;
      const typeSet = new Set(types);
      Object.defineProperty(this,'isSumType', {get: () => true});
      Object.defineProperty(this,'types', {get: () => typeSet});
    }
    
  }

  Type.prototype.toString = function () {
    return `${this.name} Type`;
  };

  function def(name, spec, {verify, sealed, types, verifiers, native} = {}) {
    if ( !name ) throw new TypeError(`Type must be named.`); 
    guardRedefinition(name);

    if ( name.startsWith('?') ) {
      if ( !! spec ) {
        throw new TypeError(`Option type can not have a spec.`);
      } 

      if ( ! verify(null) ) {
        throw new TypeError(`Option type must be OK to be unset.`);
      }
    }

    const kind = 'def';
    if ( sealed === undefined ) {
      sealed = true;
    }
    const t = new Type(name, {types});
    const cache = {spec,kind,verify,verifiers,sealed,types,native,type:t};
    typeCache.set(name, cache);
    return t;
  }

  function or(...types) { // anonymous standin for defOr
    // could we do this with `name|name2|...` etc ?  we have to sort names so probably can
    throw new TypeError(`Or is not implemented yet.`);
  }

  function defOr(name, ...types) {
    return T.def(name, null, {types, verify: i => types.some(t => check(t,i))});
  }

  function guard(type, instance) {
    guardType(type);
    guardExists(type);
    const {valid, errors} = validate(type, instance);
    if ( ! valid ) throw new TypeError(`Type ${type} requested, but item is not of that type: ${errors.join(', ')}`);
  }

  function guardType(t) {
    //console.log(t);
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
    BuiltIns.forEach(t => def(originalName(t), null, {native: t, verify: i => originalName(i.constructor) === originalName(t)}));  
    BuiltIns.forEach(t => defSub(T`${originalName(t)}`));  
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

