# jtype

Rudimentary type system for JavaScript

## getting and incorporating

We use ES modules.

You can use in your client side code like:

```JavaScript
  import {T} from 'https://unpkg.com/jtype-system/t.js';
```

While the tests are currently only written for client side, you can use in Node.js like so:

```shell
$ npm i --save jtype-system
```

```JavaScript
import {T} from 'jtype-system';
```

But you'll need to be using [ESM](https://www.npmjs.com/package/esm)

## aim

```javascript

// builtin type literal
const stringType = T`String`

// custom type literal
const todoType = T`Todo`

// defining a custom type

T.def('Todo', {
  text: T.compound(T`String`, v => v.length < 1000),
  id: T`Number`,
  active: T`Boolean`,
  editing: T`Boolean`,
  completed: T`Boolean`
})

T.defCollection('TodoList', {
  container: T.enum(T`Array`, T`Set`), 
  member: T`Todo`
});

// verifying a type instance, aliased by 'check' and 'verify'

T.check('Todo', { text: 'abc', id: true }); // false
T.verify('Todo', {text: 'abc', id: 1, active: true, editing: false, completed: false}); // true

// guarding a type instance

T.guard('Todo', { text: 'abc', id: true }); // throws TypeError

// getting errors

T.errors('Todo', {text: 'abc', id: 1, active: true, editing: false, completed: false}); // []

T.errors('Todo', {text: 'abc', id: 1, /* active: true, */ editing: false, completed: false}); // []
```

In the final case `T.errors` returns:

```
[
  { error: "Missing field", itemType: "Todo", missingProp: "actvie", missingPropType: "Boolean",
    message: "Instance of type Todo is missing field active of type Boolean." }
]
```

But this is not all. You can also:

```JavaScript

// option type

const optionalString = T.option(T`String`);
```

So we've seen:

- Collection types (container and member)
- Compound types (a type augmented with one or more verifiers)
- Enum types (lists of other types)
- Option types 
- Type verification, erroring and guarding.
- Custom type definition
- Built-in types already defined

This is pretty good. 

Future roadmap:

- 'decorating' a function with a type signature and having it autoguarded.
- method polymorphism (same name, multiple type signatures)
- type inherence, given an object of unknown correct type, find it's most specific type
- type mixin
- type inheritance ? (unsure about this one)

## what works sofar

Most of the above examples work. Some major exceptions are error collecting is way less than it will be.

The other thing is currently the verification methods (`check`, `validate`, `verify`, `errors`) only support an actual
Type object as first argument, rather than a String name. I might change that in future, or I might not. 

## faq - why not just TypeScript?

Why add transpilation and a tool chain, and change your code, and add a whole bunch of assumptions, 
when you can write a rudimentary type system in JS in a couple hundred lines.

## purpose

I made this because I wanted to replace boilerplate repitiious checking code at the start of functions with 
something that was more consistent across different functions and frameworks, and that saved me time and saved me from thinking about the same types of book keeping, parameter validation issues, again and again.

This is not supposed to be some "Ideal Type System", it is meant to be a practical tool that helps with the above to improve developer productivity. But ideas from "Ideal type systems", and "theories" are liberally borrowed when they are useful for this purpose / make the code / conceptual model cleaner and clearer. 


