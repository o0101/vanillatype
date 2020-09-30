# :icecream: [vanillatype](https://github.com/crislin2046/vanillatype) ![npm downloads](https://img.shields.io/npm/dt/jtype-system) ![version](https://img.shields.io/npm/v/jtype-system?label=%22%22)

Lightweight run time types for vanilla JavaScript and Node.JS.

## A Users example from production

*users.js:*
```javascript
  import {T} from 'vanillatype';

  T.def('User', {
    _id: T`ID`,
    _owner: T`ID`,
    username: T`Username`,
    email: T`Email`,
    newEmail: T.maybe(T`Email`),
    salt: T`Integer`,
    passwordHash: T`Hash`,
    groups: T`GroupArray`,
    stripeCustomerID: T`String`,
    verified: T.maybe(T`Boolean`)
  });

  export default function validate(user) {
    const errors = T.errors(T`User`, user);

    validateUsernameUniqueness(user, errors);

    return errors;
  }
  
  //...
```

*types.js:*
```javascript
  import {T} from 'vanillatype';

  // regexes 
  
    const UsernameRegExp = /^[a-zA-Z][a-zA-Z0-9]{4,16}$/
    const EmailRegExp = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
    const HexRegExp = /^[a-f0-9]{8,100}$/i;
  
  // common types
  
    T.defOr('MaybeBoolean', T`Boolean`, T`None`);
    
    T.defOr('ID', T`String`, T`Number`);

    T.def('URL', null, {
      verify: i => { 
        try { 
          return new URL(i); 
        } catch(e) { 
          return false; 
        }
      },
      help: "A valid URL"
    });

  // user field types
  
    T.defCollection('GroupArray',  {
      container: T`Array`,
      member: T`String`
    });

    T.def('Username', null, {
      verify: i => UsernameRegExp.test(i) && i.length < 200, 
      help:"Alphanumeric between 5 and 16 characters"
    });
    
    T.def('Email', null, {
      verify: i => EmailRegExp.test(i) && i.length < 200, 
      help: "A valid email address"
    });
    
    T.def('Hash', null, {
      verify: i => HexRegExp.test(i) && i.length < 200, 
      help: "A hexadecimal hash value, between 8 and 100 characters"
    });
```

Taken from [servedata/_schemas/users.js](https://github.com/cris691/servedata/blob/master/_schemas/users.js) and [servedata/types.js](https://github.com/cris691/servedata/blob/master/types.js)

## Features

- built-in support for built-in types!
- common patterns like **collection, or, maybe** and **enum** types
- fully optional
- simple literate syntax
- custom help fields to add context to type errors
- optional partial (subset) matching

## Function list
- T.check
- T.sub
- T.verify
- T.validate
- T.partialMatch
- T.defEnum
- T.defSub
- T.defTuple
- T.defCollection
- T.defOr
- T.option
- T.defOption
- T.maybe
- T.guard
- T.errors
- annotate a function to take and return types ([coming](https://github.com/cris691/vanillatype/issues/13)!)
- built in specials:
```js
function defineSpecials() {
    T.def(`Any`, null, {verify: () => true});
    T.def(`Some`, null, {verify: i => !isUnset(i)});
    T.def(`None`, null, {verify: i => isUnset(i)});
    T.def(`Function`, null, {verify: i => i instanceof Function});
    T.def(`Integer`, null, {verify: i => Number.isInteger(i)});
    T.def(`Array`, null, {verify: i => Array.isArray(i)});
    T.def(`Iterable`, null, {verify: i => i[Symbol.iterator] instanceof Function});
  }
```

## Another reason I like this

Apart from writing it myself to suit my own work style, which is a great reason to like something, I like this because, if I want to change the syntax, or add some new feature that I want, it's really easy to change the library, which is only a couple hundred lines of code. If I wanted the same results from a third-party library, I'd have to wait. 

## More examples

For more comprehensive examples see [vanillatype's test file](https://github.com/cris691/vanillatype/blob/master/test.js).

## getting and incorporating

You can use the template repo or import using the old name on npm (vanillatype wasn't available to me, it is now).

We use ES modules.

You can use in your client side code like:

```JavaScript
  import {T} from 'https://unpkg.com/jtype-system/t.js';
```

While the tests are currently only written for client side, you can use in Node.js like so:

```shell
$ npm i --save vanillatype
```

or using the old name

```shell
$ npm i --save jtype-system
```

Then:

```JavaScript
import {T} from 'jtype-system';
```

But you'll need to be using [ESM](https://www.npmjs.com/package/esm) or ES Modules.


-------------

***VanillaType!***
