# NLON protocol

Protocol version 1.0.0

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL
NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED",  "MAY", and
"OPTIONAL" in this document are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

## Peers

NLON is a bidirectional communication protocol. Each participant has an equal
set of tools to communicate, in contrast to server-client setups for example,
where the client requests data and the server responds with it.

Participants from here on will be referred to as *Peers*.

> Note: Implementations MAY use other names for specialized concepts, for
> example a class only responding to incoming data MAY be called `Server`, even
> though in NLON terms it's still a Peer, albeit with limited functionality.

## Stream

Communication between Peers happen over *Streams*. For our intents and purposes,
a Stream can be anything that is able to transmit an arbitrary set of bytes
from one Peer to another.

An important requirement for Streams is to be
bidirectional - that is, the same way that Peer A can send data to Peer B, Peer
B must also be able to send data to Peer A.

And in the same vein, Streams in this specification have two participants
exactly.

For example, Sockets, IPC, Named pipes or even email threads can be considered
Streams. Or, to consider this in terms of implementation, [Node's Duplex] is a
good example.

[Node's Duplex]: https://nodejs.org/api/stream.html#class-streamduplex

## Messages

The most basic atom of communication over streams is the Message. Each message
is a JSON object terminated by a newline. Following is an example JSON with all
possible fields:

```json
{
  "header": {
    "correspondenceId": "string",
    "subject": "string",
    "authorization": "string?"
  },

  "type": "data|fin|err|?",
  "body": "any",
  "error": {
    "type": "string",
    "message": "string"
  }
}
```

Each field is discussed in the following sections.

> Note: For every field the header "MUST" contain, the requirement also means
> that the field's value MUST NOT be `undefined`.

### Headers

Every Message MUST contain a `header` field. The header's role is to provide
information about the message and context on how to process it. It MUST be a
JSON object.

#### correspondenceId

The header MUST contain a `correspondenceId` field. Implementations MUST support
string values for this field and MAY support other types.

Its value can either refer to an already established correspondence, or a
completely new one. Correspondences are described later in this document.

#### subject

The header MUST contain a `subject` field. Implementations MUST support string
values for this field and MAY support other types.

Its value is the main factor on how to process the message, similar to an HTTP
request's path.

#### authorization

The header MAY contain an `authorization` field. If it does, implementations
MUST support string values and MAY support other types as well. Similar to
HTTP's Authentication header, the `authorization` field is intended to transmit
authentication and authorization data.

Implementations SHOULD use this field for authorization / authentication, but if
necessary, exceptions can be made in cases where both peer implementations can
agree on a shared meaning for the header.

#### Other fields

The header MAY contain other, arbitrary fields. These can be added and
interpreted freely by the implementation.

Implementations MAY ignore these arbitrary fields.

### Message types

Each Message MAY contain a `type` field. If it does, it MUST have one of the
following string values:

- "data"
- "fin"
- "err"

If the `type` field is not present or its value is undefined, implementations
MUST assume the type to be "data".

If the `type` field is present, but its value is not contained in the above
list, the message MUST be considered invalid ( see [Invalid messages] )

The individual message types are discussed below.

[Invalid messages]: #invalid-messages

#### Data

Data messages are either marked by the "data" type.

This message type transmits a chunk of data as part of a correspondence. For
this message type, the `body` field is RECOMMENDED to be present with a value.
For the field's value, implementations MUST support any valid JSON data type.

For nice use cases, the `body` MAY be omitted or set to `undefined`.

#### Finish

Finish messages are marked by the "fin" type.

This message type signifies the sending Peer ending the correspondence.

Finish messages MAY have a `body`, with the same requirements as for "data"
messages.

#### Error

Error messages are marked by the "err" type.

This message type is used to communicate some kind of error to the Peer, for
example during processing the message.

For error messages, the `body` field MUST NOT be present, and the `error` field
MUST be a JSON object with the following two fields:

- `type`
  - MUST be a string, RECOMMENDED to contain a short error type identifier,
    intended for machine interpretation
  - Example: `"UnknownSubject"`
- `message`
  - MUST be a string, RECOMMENDED to contain a human-readable description of the
    error
  - Example: `"No known handler for subject \"session/loging\""`

### Invalid messages

If a Message does not conform to the above requirements, it is considered
invalid. Implementations MUST NOT process invalid messages and MAY respond with
an error message.

If the message's correspondence is decipherable, implementations MAY terminate
the correspondence as described under the [Correspondences](#correspondences)
chapter.

## Correspondences

Each message is processed as part of a Correspondence. A single Correspondence
can contain one or more messages.

Each Correspondence has an identifier, that is included in the Message Header,
to associate Messages with Correspondences.

Every active Correspondence's ID SHOULD be unique to that particular
Correspondence. Multiple Correspondences can use the same ID for very specific
use cases if required, but for almost every case this won't be the best
solution.

The uniqueness constraint intentionally mentions *active* Correspondences. Once
a Correspondence is terminated by both Peers, implementations MAY reuse its ID.

### Initiation

Initiating a new Correspondence is done by sending a "data" message with a
previously unused ID. Implementations MUST treat unknown Correspondence ID's as
new Correspondences.

### Conversation

Once the Correspondence has been initiated, it can be used to exchange data.
This is done by sending data messages back and forth, using the same
Correspondence ID. 

During the conversation, both Peers can send messages at any given time, without
restrictions to order or timing.

Having a conversation part enables streaming data, e.g. instead of sending one
huge message with a large data set, potentially forcing the receiving Peer to
buffer it all in memory, the data can be broken up into multiple messages, each
chunk being processed as received, instead of buffering all of it in memory.

### Termination

Once a Peer is done with a Correspondence and doesn't intend to send any more
data, it MUST terminate the Correspondence by sending a [Finish message].

Finish messages are strictly required, so that the receiving Peer can free any
resources it has allocated for the Correspondence. Peers MAY consider a
Correspondence terminated after an arbitrary time of inactivity. Peers SHOULD
NOT send any messages over a Correspondence after they have terminated it. Peers
MUST receive all incoming messages over a Correspondence, even if they have
already terminated it.

Note that Correspondences are terminated on both ends, meaning that both Peers
need to send a Finish message for the Correspondence to be fully terminated.

[Finish message]: #finish

### Errors

Peers MAY signify error events by sending an [Error message]. Implementations
SHOULD consider the Correspondence terminated after receiving an Error message
on it.

[Error message]: #error
