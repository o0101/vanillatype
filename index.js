const BuiltIns = [Symbol, Boolean, Number, String, Object, Array, Set, Map, WeakMap, WeakSet,
                  Uint8Array, Uint16Array, Uint32Array, Float32Array, Float64Array,
                  Int8Array, Int16Array, Int32Array, 
                  Uint8ClampedArray];
const typeCache = new WeakMap();

mapBuiltins();

Object.assign(T, {check, verify, def, defCollection, option, enum, guard, errors});

export default function T(parts, ...vals) {
  parts = [...parts];
  vals = [...vals];
  const typeName = parts[0];
}

function check(typeName, instance) {

}

function verify(...args) { return check(..args); }

function defCollection(name, {container, member}) {

}

function def(name, spec) {

}

function enum(...types) {

}

function guard(typeName, instance) {

}

function errors(typeName, instance) {

}

function mapBuiltins() {
  
}

