
  // FIXME verify functions ought to throw if they fail so errors can be collected 
  // without introducing a return value semantics
  self.DEBUG = true;
  import {T} from './t.js';
  Object.assign(self, {T});

  T.def('Cris', {
    ['a.b.c']: T`String`
  });

  const result1 = T.validate(T`Cris`, {a:1});
  console.log({result1});

  const result2 = T.validate(T`Cris`, {a:{b:{c:'asdsad'}}});
  console.log({result2});

  T.defCollection(`DOMList`, {
    container: T`>NodeList`,
    member: T`>Node`
  });

  const result3 = T.validate(T`DOMList`, document.querySelectorAll('*'));
  const result4 = T.validate(T`DOMList`, document.body.childNodes);

  console.log({result3,result4});

  T.defTuple(`TypeMapping`, {
    pattern: [T`String`, T`>Object`]
  });

  T.defCollection(`TypeMap`, {
    container: T`Map`,
    member: T`TypeMapping`
  });

  const result5 = T.validate(T`TypeMap`, T[Symbol.for('jtype-system.typeCache')]);

  console.log({result5});

  const result6 = [
    T.check(T`Iterable`, []),
    T.check(T`Iterable`, "ASDSAD"),
    T.check(T`Iterable`, new Set()),
    T.check(T`Iterable`, document.querySelectorAll('*')),
    T.check(T`Iterable`, {}),
    T.check(T`Iterable`, 12312),
  ];

  console.log({result6});

  T.defOr(`Key`, T`String`, T`Integer`);
  T.defOption(T`Key`);

  const keys = [
    "ASDSA",
    1312312,
    "asd",
    123122232
  ];
  const not_keys = [
    "ASDSA",
    1312312,
    "asd",
    1231.22232
  ];
  const gappy_keys = [
    "ASDSA",
    1312312,
    "asd",
    null,
    908098,
    null,
    "1232",
    'safsda'
  ];

  T.defCollection(`KeyList`, {container: T`Iterable`, member: T`Key`});
  T.defCollection(`OptionalKeyList`, {container: T`Iterable`, member: T`?Key`});

  const result7 = T.validate(T`KeyList`, keys);
  const result8 = T.validate(T`KeyList`, not_keys);
  const result9 = T.validate(T`OptionalKeyList`, gappy_keys);

  console.log({result7, result8,result9});

  T.def(`StrictContact`, {
    name: T`String`,
    mobile: T`Number`,
    email: T`String`
  }, {sealed:true});

  const result10 = T.validate(T`StrictContact`, {name:'Cris', mobile:999, email:'777@gmail.com'});
  const result11 = T.validate(T`StrictContact`, {name:'Cris', mobile:999, email:'777@gmail.com', new:true});

  console.log({result10,result11});
