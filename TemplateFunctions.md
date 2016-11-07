# Template Functions

The way to query a Jinaga application is to write a template function. This is a function that returns the shape of a JSON fact. It takes one parameter, which is the predecessor of the fact.

```JavaScript
function templateFunction(predecessor) {
  return {
    type: 'MyApp.Type',
    role: predecessor
  };
}
```

Use template functions with `j.watch`, `j.query`, `j.where`, and `j.not`. The template will match all facts that have the specified constant values (conventionally used for `type`), and the predecessor in the specified role.

## Conditions

To limit the matching facts based on their successors, define a second template function. If any facts match the template, then the condition is true.

```JavaScript
function hasChild(p) {
  return {
    type: 'MyApp.Child',
	parent: p
  };
}
```

Use a condition in a template function by passing it to `j.where`.

```JavaScript
function templateFunction(predecessor) {
  return j.where({
    type: 'MyApp.Type',
    role: predecessor
  }, [hasChild]);
}
```

### Negating conditions

You can negate a condition within the function itself using `j.not`.

```JavaScript
function hasNoChild(p) {
  return j.not({
    type: 'MyApp.Child',
	parent: p
  });
}
```

Or you can negate the condition when using the function.

```JavaScript
function templateFunction(predecessor) {
  return j.where({
    type: 'MyApp.Type',
    role: predecessor
  }, [j.not(hasChild)]);
}
```

