# Security

A message can be used to identify an individual user of the application. Such a message will have a public key, represented as a base-64 encoded string, as a property called **publicKey**.

```JavaScript
var user = {
  type: "Jinaga.User",
  publicKey: "-----BEGIN RSA PUBLIC KEY-----\nMIGJAoG...MBAAE=\n-----END RSA PUBLIC KEY-----\n"
}
```

Your client-side app won't need to generate this key. The distributor will manage the user's identity for you. Just call Jinaga to get the user's identity based on their current OAuth2 token.

```JavaScript
j.login(function (u) {
    if (!u)
        window.location = "http://jinaga.cloudapp.net/login";
    else
        user = u;
});
```

The distributor retains the user's private key, so that any messages posted with the user's OAuth2 token will be correctly decrypted and signed.

## Privacy

To send a private message to an individual, set the individual as the **to** property of the message. The distributor will encrypt the message using that user's public key.

```JavaScript
var secret {
  type: "Secret",
  to: flynn,
  password: "Reindeer Flotilla"
};

j.fact(secret);
```

The distributor will store the encrypted message. It will only decrypt the message for the user to which it is sent. That user must supply an OAuth2 token so that the distributor can access their private key. No other users will receive the message, even if they submit a query that would match it.

## Authenticity

To sign a message, set your own user object as the **from** property of the message. The distributor will sign the message using your private key when you post it using your OAuth2 token.

```JavaScript
var email {
  type: "Email",
  to: alan1,
  from: flynn,
  content: "It's all in the wrists."
};

j.fact(email);
```

The distributor will verify signatures before delivering any messages. The client application never sees the signature, but the message would not be delivered if the signature was invalid. Upon receiving a message with a **from** property, you can be certain that it was from that sender and was not tampered with.

## Secrecy

A shared key can be used to encrypt messages that multiple people can all see. Set the **admin** property of a successor message to indicate that a user has admin privileges for that object. The shared key will be encrypted using that user's public key.

```JavaScript
var project {
  type: "Project",
  name: "Space Paranoids",
};

var flynnPrivilege {
  type: "Privilege",
  admin: project,
  to: flynn,
  from: flynn
};

j.fact(project);
j.fact(flynnPrivilege);
```

Your client app does not need to generate the shared key. The distributor will generate it and store it in the successor message.

The successor must be encrypted. So it must have a **to** predecessor. The admin can generate additional messages to assign privileges to other users. Set the **read** or **write** properties for these additional privileges.

```JavaScript
j.fact({
  type: "Privilege",
  write: project,
  to: alan1,
  from: flynn
});
```

This message contains the shared key for the project. It is encrypted using Alan's public key, so that only Alan can receive the message. It is signed using Flynn's private key, so that its authenticity can be validated. Since only an admin can assign privileges, only messages signed by an administrator of the object will be honored.

Now that Flynn has write privileges to the project, he can create successors.

```JavaScript
j.fact({
  type: "Instruction",
  in: project,
  from alan1,
  program: "TRON"
});
```

The message will be encrypted using the project's shared key. That shared key is available to Alan, because it is stored in the privilege message that Flynn created for him. That privilege message is encrypted using Alan's public key, so only Alan can decrypt it. Only messages signed by an individual with admin or write privileges will be accepted and returned by the distributor.
