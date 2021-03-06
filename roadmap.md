#Jinaga Roadmap

These are the large steps toward the vision of Historical Modeling in JavaScript, and beyond to other platforms. Earlier steps are smaller and more detailed, while later steps will require still more definition.

## Performance

The focus of the next step is performance. Performance has improved greatly, but there is one significant step left to do.

Currently, when a socket is lost, the client will initiate a new connection. The server has no information about the facts that the client has already received, and so it will restart the stream from the beginning of history. Once fact references are available, a client will be able to inform the server of the last fact that it received. Fact references should be monotonically increasing to help the server resume the stream.

## Security

The security mechanisms on the roadmap are documented in [Security](https://github.com/michaellperry/jinaga/blob/master/security.md). Currently, the validation of the `to` and `from` predecessors is implemented as documented in the "Privacy" and "Authenticity" sections of that document. The remainder of the document is to be implemented.

Furthermore, the distributor currently does not encrypt facts at rest, as is described in the document. This encryption will be performed prior to storage, so that an attacker that compromises the database will not have access to information not already allowed by the rules of security. This will also help to prove that the rules are being properly enforced.

The distributor expects two storage providers: one for facts and the other for identities. In current implementations, these are both satisfied by the same provider. In the future, the guidance will be to separate these two stores so that an attacker would need to compromise both to gain an advantage.

**After the completion of the Performance and Security roadmap items, Jinaga will be ready for production use.**

## Offline First

One of the motivating factors for Historical Modeling is to enable a system of isolated nodes. Each node acts independently to record its decisions, reflect them immediately to the user, and eventually merge them with its peers.

Offline First is an initiative to create web applications that work while offline. I take the definition of "work" to mean that they capture user input durably, that they act upon that input immediately, and that they share that input when the connection is restored. In other words, I see "offline first" as a specific case of the motivation for Historical Modeling.

Jinaga will support Offline First by storing facts in LocalStorage or IndexedDB. Other techniques will be required to give users access to the initial page and application code without the initial connection. If a standard is written to support background upload and download of facts without the user returning to the browser, then Jinaga will support that standard as well.

## Storage Options

Currently Jinaga has a storage provider for Mongo. Providers for additional databases are desired, including:

- PostgreSQL
- CouchDB
- MySQL
- Azure Table Storage
- Amazon DynamoDB
- Google Bigtable

Application developers should be able to choose the storage option that best fits their needs.

## Alternate Clients

Jinaga is currently a JavaScript library, both client and server. However, it is desirable that clients written in other languages for non-browser platforms should be able to communicate with a Jinaga Node back-end. Additional client libraries will include:

- .NET Core (for UWP natively, and iOS and Android through Xamarin)
- ObjectiveC/Swift for iOS
- Java for Android

## Alternate Back-ends

Not only should alternate clients be able to participate in a Jinaga application, the back-end should be interchangeable as well. Application developers will choose the back-end that best fits their needs, including:

- .NET Core
- Erlang
- GO

## Microservices Guidance

With the availability of alternatives in various languages and on various platforms, Jinaga will make more sense as a backbone for a microservices architecture. As these options become available, examples and guidance will be written for creating microservices-based enterprise applications on Jinaga.