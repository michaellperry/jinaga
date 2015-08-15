# Jinaga
Reliably sync SPAs over unreliable connections.

## Historical Modeling
To reliably synchronize different browsers, you want to use a message-based protocol. But if a user makes changes while the browser is off-line, or if two users make changes at the same time, then each browser will see the messages in a different order. Most messaging patterns rely upon knowing the order of events. This is called "total ordering". Historical Modeling is a set of messaging patterns that only rely upon "partial ordering". Messages are known to have come after their predecessors, but the order between unrelated messages is not strictly known.

A message knows its predecessors: those messages that came immediately before it. For example, if I need to add a task to a to-do list, then I would let the task know about the list. The list is the predecessor, because it must exist before we can add tasks to it.

```JavaScript
var Jinaga = require ('jinaga');
var j = new Jinaga();

j.fact({
  list: {
    name: "Chores"
  },
  description: "Take out the trash"
});
```

This code represents two messages. The first is:

```JavaScript
var chores = {
  name: "Chores"
};
```

The second is:

```JavaScript
var trash = {
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
    list: l
  };
}
```

When a message matching the template is found, we want to call a function. We'll put these elements together to form a query.

```JavaScript
function taskAdded(task) {
  // Render the task in the UI
}

j.query(chores, [tasksInList], taskAdded);
```

Now if I add a new task to the list, the taskAdded function will be called.

```JavaScript
var dishes = {
  list: chores,
  description: "Empty the dishwasher"
};

j.fact(dishes);

// taskAdded is called with the dishes message.
```

A callback is only executed once per message. If you happen to add the same message again, the callback will not be invoked. 

## Conditions

Now I want to mark a task completed. Let's capture that as another message.

```JavaScript
j.fact({
  task: trash,
  completed: true
});
```

Let's write a template that matches this message for a given task.

```JavaScript
function taskIsCompleted(t) {
  return {
    task: t,
    completed: true
  };
}
```

Now we can write a query so that only the uncompleted tasks match the template.

```JavaScript
function uncompletedTasksInList(l) {
  return {
    list: l,
    __not: taskIsCompleted
  };
}

j.query(chores, [uncompletedTasksInList], taskAdded);
```

When this query is created, only the existing tasks that have not been completed will be added to the UI. So you will see "Empty the dishwasher", but not "Take out the trash". But what about when a task changes? We want to remove tasks from the UI once they are marked completed. So let's add another callback to the query.

```JavaScript
function taskRemoved(t) {
  // Remove the task from the UI
}

j.query(chores, [uncompletedTasksInList], taskAdded, taskRemoved);
```

Now when you complete a task, the taskRemoved function will be called to remove it from the UI.

```JavaScript
j.fact({
  task: dishes,
  completed: true
});

// taskRemoved is called with the dishes message.
```

# Synchronization

Where do messages come from? So far, they came from calls to **q.fact()** on the same browser. But that's not the only source.

## Other browsers

Messages come from other people using the same app. A message created in someone else's browser is shared with everyone who has issued a query. If the message matches your query, then you receive the message.

This is possible because the front end can be connected to a distributor.

```JavaScript
var distributor = require('jinaga.distributor');

j.sync(distributor.create('https://my.distributor.com');
```

The distributor stores messages while you are off-line. Start the app again, and you will receive all messages that you query.

## Local storage

Messages can be stored locally. When you start the app, it will load all messages that were created or received in the past. This is great not only for off-line scenarios, but also to ensure quick load times for previously visited pages.

```JavaScript
var storage = require('jinaga.webstorage');

j.save(storage);
```

Messages are persisted to Web Storage when they are created. When you start up again, you will receive all persisted messages that match your queries.

## Node applications

There's nothing saying that Jinaga can only be used in the browser. It can be used in Node as well. So instead of writing an application-specific API for each app, just start up Jinaga, sync with the same distributor as your front end app, and issue queries.

REST APIs do not guarantee delivery. If the front end cannot reach the server, then it receives an HTTP error. Furthermore, if the response from the server cannot be delivered, the front-end receives *the same* HTTP error. You can't tell if an API call was received or not.

Jinaga callbacks are guaranteed once-and-only-once delivery. If a message makes it to the distributor, then it will eventually make it to your Node app. If a network hiccup causes the message to be delivered twice, you callback will only be invoked once.

Since you don't need to expose an API from your Node application, you can host it within your firewall. It doesn't need to be out on the big bad Internet. Only the distributor needs to live out there.

## IOT devices

Node is a powerful option for controlling devices. Connect these devices together by syncing with a common distributor. Or, cut out the middle-man and go peer-to-peer.

```JavaScript
var io = require('jinaga.io');

io.join('other.iot.device');
j.sync(io);
```

Use the predecessor/successor relationships among messages to construct collaborative device-to-device workflows.

# Security

A message can be used to identify an individual user of the application. Such a message will have a public key, represented as a base-64 encoded string, as a property called **__publicKey**.

```JavaScript
var user = {
  __publicKey: "...nbZ15mk0zNC/WJWjM3vDRB3"
}
```

Your client-side app won't need to generate this key. The distributor will manage the user's identity for you. Just call the distributor to get the user's identity based on their current OAuth2 token.

```JavaScript
distributor.login(function (err, identity) {
  user = identity;
});
```

The distributor retains the user's private key, so that any messages posted with the user's OAuth2 token will be correctly decrypted and signed.

## Privacy

To send a private message to an individual, set the individual as the **__to** property of the message. The distributor will encrypt the message using that user's public key.

```JavaScript
var secret {
  __to: flynn,
  password: "Reindeer Flotilla"
};

q.fact(secret);
```

The distributor will store the encrypted message. It will only decrypt the message for the user to which it is sent. That user must supply an OAuth2 token so that the distributor can access their private key. No other users will receive the message, even if they submit a query that would match it.

## Authenticity

To sign a message, set your own user object as the **__from** property of the message. The distributor will sign the message using your private key when you post it using your OAuth2 token.

```JavaScript
var email {
  __to: alan1,
  __from: flynn,
  content: "It's all in the wrists."
};

q.fact(email);
```

The distributor will verify signatures before delivering any messages. The client application never sees the signature, but the message would not be delivered if the signature was invalid. Upon receiving a message with a **__from** property, you can be certain that it was from that sender and was not tampered with.

## Secrecy

A shared key can be used to encrypt messages that multiple people can all see. Set the **__locked** property to true to tell the distributor that a message should have a shared key. Set the **__admin** property of a successor message to indicate that a user has admin privileges for that object.

```JavaScript
var project {
  name: "Space Paranoids",
  __locked: true
};

var flynnPrivilege {
  __admin: project,
  __to: flynn,
  __from: flynn
};

q.fact(project);
q.fact(flynnPrivilege);
```

Your client app does not need to generate the shared key. The distributor will generate it and store it in the successor message.

The successor must be encrypted. So it must have a **__to** predecessor. The admin can generate additional messages to assign privileges to other users. Set the **__read** or **__write** properties for these additional privileges.

```JavaScript
q.fact({
  __write: project,
  __to: alan1,
  __from: flynn
});
```

This message contains the shared key for the project. It is encrypted using Alan's public key, so that only Alan can receive the message. It is signed using Flynn's private key, so that its authenticity can be validated. Since only an admin can assign privileges, only messages signed by an administrator of the object will be honored.

Now that Flynn has write privileges to the project, he can create successors.

```JavaScript
q.fact({
  __in: project,
  __from alan1,
  program: "TRON"
});
```

The message will be encrypted using the project's shared key. That shared key is available to Alan, because it is stored in the privilege message that Flynn created for him. That privilege message is encrypted using Alan's public key, so only Alan can decrypt it. Only messages signed by an individual with admin or write privileges will be accepted and returned by the distributor.
