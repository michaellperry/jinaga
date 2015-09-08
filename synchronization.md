# Synchronization

Where do messages come from? So far, they came from calls to **j.fact()** on the same browser. But that's not the only source.

## Other browsers

Messages come from other people using the same app. A message created in someone else's browser is shared with everyone who has issued a query. If the message matches your query, then you receive the message.

This is possible because the front end can be connected to a distributor.

```JavaScript
var Distributor = require('jinaga.distributor.client');

j.sync(new Distributor('ws://my.distributor.com/'));
```

The distributor stores messages while you are off-line. Start the app again, and you will receive all messages that you query.

## Local storage

Messages can be stored locally. When you start the app, it will load all messages that were created or received in the past. This is great not only for off-line scenarios, but also to ensure quick load times for previously visited pages.

```JavaScript
var Storage = require('jinaga.webstorage');

j.save(new Storage());
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
