# Jinaga
Real-time client-to-server-to-client messaging with persistence. Replace your REST API, document database, and web sockets code with this one simple, universal back end.

Get a quick [video introduction](https://vimeo.com/channels/jinaga) to Jinaga.

- [Mutablity](https://github.com/michaellperry/jinaga/blob/master/mutability.md)
- [Security](https://github.com/michaellperry/jinaga/blob/master/security.md)
- [Synchronization](https://github.com/michaellperry/jinaga/blob/master/synchronization.md)
- Conventions (coming soon)
- Migrations (coming soon)
- Checkpoints (coming soon)
- [Comparison with alternatives](https://github.com/michaellperry/jinaga/blob/master/alternatives.md)

[Contributing](https://github.com/michaellperry/jinaga/blob/master/contributing.md)

## Hello World

Install the Jinaga NPM package.

```
npm install jinaga
```

Create an application.

``` JavaScript
var Jinaga = require("jinaga");

var j = new Jinaga();

j.fact({
  message: "Hello",
  target: {
    name: "World"
  }
});

function messagesForTarget(t) {
  return {
    target: t
  }
}

function messageAdded(message) {
  console.log(message.message + ", " + message.target.name + "!");
}

j.watch({
  name: "World"
}, [messagesForTarget], messageAdded);

j.fact({
  message: "Goodbye",
  target: {
    name: "World"
  }
});
```

Run the application.

```
node app.js
```

Enjoy.

## Historical Modeling
To reliably synchronize different browsers, you want to use a message-based protocol. But if a user makes changes while the browser is off-line, or if two users make changes at the same time, then each browser will see the messages in a different order. Most messaging patterns rely upon knowing the order of events. This is called "total ordering". Historical Modeling is a set of messaging patterns that only rely upon "partial ordering". Messages are known to have come after their predecessors, but the order between unrelated messages is not strictly known.

A message knows its predecessors: those messages that came immediately before it. For example, if I need to add a task to a to-do list, then I would let the task know about the list. The list is the predecessor, because it must exist before we can add tasks to it.

```JavaScript
var Jinaga = require ('jinaga');
var j = new Jinaga();

j.fact({
  type: "Task",
  list: {
    type: "TodoList",
    name: "Chores"
  },
  description: "Take out the trash"
});
```

This code represents two messages. The first is:

```JavaScript
var chores = {
  type: "TodoList",
  name: "Chores"
};
```

The second is:

```JavaScript
var trash = {
  type: "Task",
  list: chores,
  description: "Take out the trash"
};
```

The second message knows about the first. That makes the first message (**chores**) a predecessor to the second (**trash**). The order between these two messages is known. **Chores** will always come before **trash**. But messages with no such relationship can occur in any order.

## Queries

Now that you can express that **chores** is a predecessor of **trash**, you might want to query for all messages with that same predecessor. These are called successors. For example, you might want to find all of the tasks on the **chores** list. You write this as a query. Provide a template that all desired messages will fit. For example, for a given list, this template will match all tasks on that list:

```JavaScript
function tasksInList(l) {
  return {
    type: "Task",
    list: l
  };
}
```

When a message matching the template is found, we want to call a function. We'll watch the query, and call a function when the results change.

```JavaScript
function taskAdded(task) {
  // Render the task in the UI
}

j.watch(chores, [tasksInList], taskAdded);
```

Now if I add a new task to the list, the **taskAdded** function will be called.

```JavaScript
var dishes = {
  type: "Task",
  list: chores,
  description: "Empty the dishwasher"
};

j.fact(dishes);

// taskAdded is called with the dishes message.
```

A callback is only executed once per message. If you happen to add the same message again, the callback will not be invoked.

The watch is in effect for the current session. It is destroyed implicitly with the Jinaga instance when no longer in use. If you wish to explicitly stop watching, capture the return value.

```JavaScript
var deregisterWatchChores = j.watch(chores, [tasksInList], taskAdded);

// Some time later...

deregisterWatchChores();
``` 

## Conditions

Now I want to mark a task completed. Let's capture that as another message.

```JavaScript
j.fact({
  type: "TaskCompleted",
  task: trash,
  completed: true
});
```

Let's write a template that matches this message for a given task.

```JavaScript
function taskIsNotCompleted(t) {
  return j.not({
    type: "TaskCompleted",
    task: t,
    completed: true
  });
}
```

Now we can write a query so that only the uncompleted tasks match the template.

```JavaScript
function uncompletedTasksInList(l) {
  return j.where({
    type: "Task",
    list: l
  }, [taskIsNotCompleted]);
}

j.watch(chores, [uncompletedTasksInList], taskAdded);
```

When this query is created, only the existing tasks that have not been completed will be added to the UI. So you will see "Empty the dishwasher", but not "Take out the trash". But what about when a task changes? We want to remove tasks from the UI once they are marked completed. So let's add another callback to the query.

```JavaScript
function taskRemoved(t) {
  // Remove the task from the UI
}

j.watch(chores, [uncompletedTasksInList], taskAdded, taskRemoved);
```

Now when you complete a task, the taskRemoved function will be called to remove it from the UI.

```JavaScript
j.fact({
  type: "TaskCompleted",
  task: dishes,
  completed: true
});

// taskRemoved is called with the dishes message.
```

Messages are immutable, so there is no callback for updating a result. They can only be added or removed. To handle updates, please see [Mutablity](https://github.com/michaellperry/jinaga/blob/master/mutability.md).
