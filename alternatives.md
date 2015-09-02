# Comparison with Alternatives

There are, of course, different ways of accomplishing the same results as Jinaga. Why not use one or a combination of these alternatives?

- Change tracking (for revision history)
- Optimistic concurrency (for conflict detection)
- Auditing (for intention and authentication)
- REST/CRUD (for data storage)
- SignalR (for notification)
- Firebase (for data storage and notification)
- PouchDB, ForerunnerDB, TaffyDB (for offline storage)

The short answer is that Jinaga is a single, simple API that solves all of these problems simultaneously.

The above items, on the other hand, are distinct mechanisms that separately solve part of the problem. To build a complete solution, you would have to combine these tools yourself. They weren't necessarily designed to work together.

And any one of these tools is more complex than Jinaga anyway! Jinaga has only two APIs: **fact** and **watch**. If you can replace all of these with only two APIs, why wouldn't you?

## Still not convinced?

Jinaga is based on Historical Modeling. Historical modeling is a set of primitives with which you can construct a correct distributed systems. They are axioms from which you can create theorems.

Historical Modeling is much more than auditing. It is the practice of modeling a system as a history of partially ordered historical facts. Auditing, on the other hand, is the practice of augmenting a state-based model with a sequential history of state changes. Historical Modeling is a fundamental shift in the way that you construct a model.

The advantages of historical modeling over simple auditing are:

- distribution of authority
- transparency
- partial order
- delayed conflict detection
- immutability

## Central authority

With an audited data store, you have to have one centralized authority. All changes to state are directed to this authority. To find out what happened, you query this authority. If you've ever used the term "system of record", you are implicitly talking about a central authority.

With a historical model, however, authority is distributed throughout the system. A fact is part of history from the moment that it is recorded, even if the node is disconnected at the time. You can find out what happened from any node in the system. They are all eventually consistent with one another.

## Transparency

With an audited data store, you don't have full transparency of the state changes. If you are careful, you will capture who made the change, when, and what the previous state was. But even then you might miss important information about context. You might overwrite or delete contextual information in the state-based model that you don't capture in the audit.

With a historical model, every fact records user intent. Facts are the only way to change the state of the system. Therefore, if the system depends upon a piece of information, it is in the facts. There is no way to miss important information. Facts cannot be overwritten or deleted, so context is preserved.

Compare this with Event Sourcing, which has the same benefit. Then read on...

## Partial order

With an audited data store, the audit log is fully ordered. You can tell precisely which change happened before which other change. While this sounds like a great benefit, it is actually a promise that is difficult to keep. In a distributed system without a centralized authority, not all changes can be ordered. Some will occur concurrently (that is, without knowledge of one another). If the audit log imposes a total order on changes, then it fails to document when two changes are concurrent.

With a historical model, the relationships between facts are explicitly captured. A fact is known to follow its predecessors. But not all facts are related to each other. When the relationship does not matter or is not expressed, then facts are allowed to be interpreted in either order. This makes it possible to see when two facts are concurrent. This is important for conflict detection. But more importantly, it reduces the constraints on the distributed system to a set that can be easily implemented.

Again, compare with Event Sourcing. The commonly accepted definitions of Event Sourcing imply a total order. Historical Modeling has the advantage of partial order, making it work better in distributed, occasionally-connected systems.

## Delayed conflict detection

Historical modeling is more powerful than optimistic concurrency. It can recognize and deal with conflicts even when a connection to a central authority cannot be established.

Optimistic concurrency assumes that you can get to the server while the user is still present and in the mindset to resolve the conflict. If they are disconnected for a short time, the change they made will be queued and retried. The user might have moved on. You're dragging them back to a change they made earlier, that they believed was already taken. Do this often enough, and users loose confidence that anything they've done actually took.

Better to honor the user's decision. Capture the information that they had available when making that decision. Those are the predecessors of the fact. Then when you go back and examine history, you can clearly see what happened. Armed with complete information, you can interpret the history of decisions correctly. You never throw user input on the floor.

## Immutability

The databases listed above generally take a document-oriented approach to storage. Documents are mutable. The application makes changes to documents, and the database records versions of those documents.

Jinaga, on the other hand, records changes as immutable facts. The relationships among those facts captures the history of the changes.

Mutable documents are difficult to synchronize between devices. Each of the solutions above has a different set of solutions to those difficulties. But each one eventually runs into edge cases. The only provably correct way to keep two values in sync is to prove that that value cannot change.