# jtype

Rudimentary type system for JavaScript

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

