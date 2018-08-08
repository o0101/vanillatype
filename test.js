
  import {T} from './jtype.js';
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

  const result5 = T.validate(T`TypeMap`, typeCache);

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
