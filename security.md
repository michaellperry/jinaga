# Security

A message can be used to identify an individual user of the application. Such a message will have a public key, represented as a base-64 encoded string, as a property called **publicKey**.

```JavaScript
const user = {
    type: "Jinaga.User",
    publicKey: "-----BEGIN RSA PUBLIC KEY-----\nMIGJAoG...MBAAE=\n-----END RSA PUBLIC KEY-----\n"
}
```

Your client-side app won't need to generate this key. The distributor will manage the user's identity for you. Just call Jinaga to get the user's identity based on their current OAuth2 token.

```JavaScript
const user = await j.login();
if (!user)
    window.location = "http://jinaga.cloudapp.net/login";
```

The distributor retains the user's private key, so that any messages posted with the user's OAuth2 token will be correctly decrypted and signed.

## Authorization

The application controls which users are authorized to post certain facts.
For each type, it specifies a query that returns all authorized users.
Multiple queries can be registered for a single type, which would authorize any user returned by any of the queries.

```JavaScript
const { handler, j, withSession } = JinagaServer.create({
    pgStore: postgresConnectionString,
    pgKeystore: postgresConnectionString,
    authorization: JinagaServer.authorization(a => a
        .type('Project', j.for(ownerOfProject))
        .type('Contibutor', j.for(projectOfContributor).then(ownerOfProject))
        .type('Entry', j.for(projectOfEntry).then(ownerOfProject))
        .type('Entry', j.for(projectOfEntry).then(contributorsOfProject))
    )
});
```

Authorization is computed on the server at the time of fact creation.
If the logged in user is not returned by the query based on data already on the server at the time of creation, then the fact is rejected.
There may indeed be a fact in flight that would grant the user authorization.
But if the server doesn't know about this authorizing fact, then authorization is rejected.

Similarly, there may be a fact in flight that revokes authorization.
If the server has not yet learned about this revocation, then the creation is nonethess authorized.
Authorization is final, and not revoked after-the-fact (so to speak) when the revocation arrives.

The consequence of this time-of-creation rule is that authorization is not deterministic.
A fact may be authorized on one server, but not another, based on the supporting information that they each have.
Furthermore, a fact that is authorized at one time may not have been authorized later on the same server, based on the arrival of new information.

If a Jinaga server is created without an authorization object, then all facts are authorized.
But if it is created with an authorization object, then only the listed types are accepted.
Any types not specified are not accepted.