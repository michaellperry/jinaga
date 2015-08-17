# Mutability

Messages are immutable. So how do you model something that changes? You have to follow a pattern that records each mutation as an immutable message.

## Mutable properties

Capture each change to a mutable property as individual messages. For example, the title of a book might be represented as a mutable string. The creation of a book is the first historical message. (We'll generate a globally unique id for the book.)

```JavaScript
var myBook = {
  id: j.unique()
};

j.fact(myBook);
```

The next message is the initial title of the book.

```JavaScript
var initialTitle = {
  book: myBook,
  title: "All's Well that Ends Well"
};

j.fact(initialTitle);
```

To change the book's title, issue another message. The message should refer to the previous title as a predecessor, so that we can tell that it has replaced the prior value.

```JavaScript
var revisedTitle = {
  book: myBook,
  title: "War and Peace",
  prior: [initialTitle]
};

j.fact(revisedTitle);
```

To watch for changes to mutable properties, create a query matching change messages that have not been replaced.

```JavaScript
funciton titleIsCurrent(t) {
  return j.not({
    prior: t
  });
}

function bookTitle(b) {
  return {
    book: b,
    __where: [titleIsCurrent]
  };
}

function titleAdded(bookTitle) {
  var e = window.getElementById("book_title");
  e.innerText = bookTitle.title;
}

function titleRemoved(bookTitle) {
  // See below...
}

j.watch(myBook, [bookTitle], titleAdded, titleRemoved);
```

## Conflict detection

Because every change to a mutable property records the previous messages, we can tell when a conflict has occurred. If two people changed a mutable property at the same time (perhaps one was off-line), then both of those changes will refer to the same predecessor.

```JavaScript
var anotherRevisedTitle = {
  book: myBook,
  title: "All's Fair in Love and War",
  prior: [initialTitle]
};

j.fact(anotherRevisedTitle);
```

When this message is received, **titleAdded** will be called again, but not **titleRemoved**. The initial title was already removed by the first change. To detect this, we keep a list of candidates.

```JavaScript
var _ = require("lodash");

var titleCandidates = [];

function titleAdded(bookTitle) {
  titleCandidates.push(bookTitle);

  var e = window.getElementById("book_title");
  e.innerText = _.pluck(titleCandidates, "title").join(", ");
}

function titleRemoved(bookTitle) {
  _.remove(titleCandidates, _.isEqual, bookTitle);
}
```

If a conflict is detected, the **titleAdded** function will list all candidate values for the user. You could determine your own behavior. For example, show a conflict indicator if **titleCandidates.length** is greater than 1.

By the way, **titleRemoved** will be called before **titleAdded**, so it is correct to delay the update of the element until the new title has been added.

## Conflict resolution

Notice that the **prior** predecessor is an array. This allows a message to reference more than one prior value. That's how you resolve a conflict.

```JavaScript
j.fact({
  book: myBook,
  title: "War and Peace",
  prior: titleCandidates
});
```

This will cause all of the candidates to be removed, and replaced by the one resolution message.

When this resolution message is shared with the other user involved in the conflict, then it will be resolved on their side as well.

## Intention-capturing messages

You could model an entire system using this pattern to represent mutable properties. But the strength of historical modeling is that it encourages you to instead capture the intent of the message. What does it really mean to change the title of a book? Was it the author proposing a new title to the publisher? Or was it a librarian correcting an error in the catalog? Each of these would have different meaning within the system, and should therefore be captured as different messages.

The mutable property pattern is a good start to a model. But you should always consider the intent behind each message. Don't simply model properties as you would in an object-oriented or relational system.
