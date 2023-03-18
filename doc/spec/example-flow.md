# An example flow

To illustrate the nlon protocol, let us take an example of traffic between two
peers. For the sake of this example, consider one of the peers being a server
managing chat lobbies, and the other peer being a client that wants to join a
lobby.

To do this, the following flow of actions need to be done:

1. The client connects to the server
1. The client sends a login message with its credentials
1. The server responds with a single message, containing a session id
1. The client requests a list of all the lobbies available
1. The server replies with data about all the lobbies, in multiple messages
1. The client selects a lobby and sends a request to join it
1. The server adds the client to the lobby and responds

If all of these steps are completed successfully, the client is now a proud
participant of the lobby of its choice.

## Connection

To initiate any kind of traffic, a connection must be established between the
two peers. nlon itself is not tied to any transport protocol, so technically
this could be any kind of connection, as long as there's an implementation for
it.

In practice, this could be a TCP connection, or even a WebSockect connection
when running from the browser.

Once the connection is established, peers are free to exchange messages. Either
participant can send the first message - depending on the use case, the
connecting peer can send the first message, e.g. requesting some data, or the
accepting peer can initiate, e.g. sending the current game state when joining as
a spectator to an online chess game.

## Login

### Initiating a correspondence

To login, the client peer sends the first message:

```
{"type":"data","header":{"correspondenceId":"E_zR2htw1JgVujZX7b2gl","subject":"login"},"body":{"user":"foo","password":"changeit"}}\n
```

This is a JSON object, terminated by a newline. The last newline is very
important, as that's what marks the end of each message, making nlon fit for
stream-type transports.

For the sake of readability, from here on each message will be formatted as JSON
with multiple lines and indentation:

```json
{
  "type": "data",
  "header": {
    "correspondenceId": "E_zR2htw1JgVujZX7b2gl",
    "subject": "login"
  },
  "body": {
    "user": "foo",
    "password": "changeit"
  }
}
```

By sending the above message, the client has initiated a new correspondence.
This is simply done by creating a new, unique correspondence ID.

By setting the *subject*, the client indicates the operation / resource it
needs. In this case it's `login`, meaning it would like to start a new user
session, by specifying its credentials in the message body.

Lastly, notice the *type* field - it is set to `data`, which means that the peer
is transmitting information in the message.

> Note: For the sake of simplicity, in this example the password is transmitted
> as cleartext. Please be aware that this might not be the best approach to use
> in production - depending on the connection, this could be prone to
> man-in-the-middle attacks.

### Accepting the login

Upon receiving the login request, the server validates the credentials, and
responds with the following:

```json
{
  "type": "fin",
  "header": {
    "correspondenceId": "E_zR2htw1JgVujZX7b2gl",
    "subject": "login"
  },
  "body": "pyrRd5cadGBXm6PnyND_D"
}
```

There's multiple points of note in this message.

The first being, that the message type changed from `data` to `fin`, short for
*finish*. This means that the server does not intend to send any more messages
on this correspondence. The last piece of data it wants to send is there in the
*body* field.

> Note: Correspondences can also be closed without data as well. In this case,
> the *body* field is simply omitted.

If you have exceptionally good memory, you might have noticed that the
correspondence ID is exactly same as for the previous message. This means that
the server is *replying* to the previous message, instead of starting an
entirely different conversation on a new thread.

Lastly, the *body* is now a string, instead of an object. The body can be any
valid JSON value, its interpretation is up to the receiving peer. In this case,
it's a session token the client can use to identify itself.

> Note: For simplicity, this example uses session tokens. Again, depending on
> the connection, this could be prone to session hijacking, please consider
> security factors for production use.

### Closing

In the previous message, the server has closed the correspondence on their end.
However, correspondences need to be closed by both peers before considering them
closed. Actually closing correspondences is important, otherwise peers wouldn't
know whether they should expect more messages on it. After closing on both
sides, peers can free any resources allocated to that particular correspondence,
and even reuse the ID if needed.

To close the correspondence, the client peer sends the following message:

```json
{
  "type": "fin",
  "header": {
    "correspondenceId": "E_zR2htw1JgVujZX7b2gl",
    "subject": "login"
  }
}
```

Once again, the *type* is `fin`, and the correspondence ID stays the same, so
the receiving server peer knows which correspondence is being closed.

Once this is sent, both peers can free the resources allocated for this
correspondence.

> Note: Technically only the *type* and *correspondenceId* is required to close
> the correspondence in this case. The rest of the headers are sent by the
> reference implementation, but are not required for other implementations.

## Listing lobbies

### List request

Armed with its session token, the client sends a request to the server to list
all the available lobbies:

```json
{
  "type": "fin",
  "header": {
    "correspondenceId": "stJSvdBQ939FBAzaFyeTc",
    "subject": "lobbies/list",
    "authorization": "pyrRd5cadGBXm6PnyND_D"
  }
}
```

As the keen observer might notice, a new correspondence ID is used here. This
means that a new correspondence has been started, since this exchange of
messages is logically different from the previous correspondence about login.

In addition, an *authorization* header is now added to the message. The
specification doesn't explicitly state what scheme should be used for this
field, as long as both peers can agree on its meaning it is fine. In this case,
we use the session token from  the previous exchange.

> Note: Headers can contain arbitrary data not specified by the spec, similar to
> HTTP's custom headers. This can be done by adding extra fields to the *header*
> object, with the header name as key.

What might seem unusual about this message is that - even though it is the first
message in the correspondence - its *type* is `fin`. This is perfectly valid, it
only means that the initiating peer is not planning to send any more data.
However, it will accept any data it receives in response.

### List response

Upon receiving the request, the server validates the authorization header and
gathers the list of lobbies visible to the client.

Since the number of lobbies could potentially be huge, it will send data about
each lobby in a separate message, to allow for streaming. This also means that
the client can update its state incrementally, instead of having to parse
through one huge message, potentially blocking it while it's updating its UI.

The following sequence of messages is sent:

```json
{
  "type": "data",
  "header": {
    "correspondenceId": "stJSvdBQ939FBAzaFyeTc",
    "subject": "lobbies/list",
    "authorization": "pyrRd5cadGBXm6PnyND_D"
  },
  "body": {
    "id": "SWgvZBYlqhacM6uyWagtg",
    "name": "Tavern",
    "online": 11
  }
}
{
  "type": "data",
  "header": {
    "correspondenceId": "stJSvdBQ939FBAzaFyeTc",
    "subject": "lobbies/list",
    "authorization": "pyrRd5cadGBXm6PnyND_D"
  },
  "body": {
    "id": "uwRoV_ZDhVSLgc_jKtsTU",
    "name": "Support",
    "online": 6
  }
}
{
  "type": "data",
  "header": {
    "correspondenceId": "stJSvdBQ939FBAzaFyeTc",
    "subject": "lobbies/list",
    "authorization": "pyrRd5cadGBXm6PnyND_D"
  },
  "body": {
    "id": "uwRoV_ZDhVSLgc_jKtsTU",
    "name": "General",
    "online": 18
  }
}
```

Each of these messages is a reply to the same correspondence, with the `data`
message type.

> Note: Although each message body has the same schema in this example, this is
> not a requirement. Message bodies can have different shapes as long as each
> peer agrees on how each message body should look like.

Once all the available lobbies are sent, a final message is sent by the server
to close the correspondence:

```json
{
  "type": "fin",
  "header": {
    "correspondenceId": "stJSvdBQ939FBAzaFyeTc",
    "subject": "lobbies/list",
    "authorization": "pyrRd5cadGBXm6PnyND_D"
  }
}
```

Once again, the correspondence is closed by both peers, the correspondence can
be freed.

## Joining a lobby

### Join request

Now with a list of lobbies, the client decides to join the Tavern. To this end,
it sends the following message, initiating a new correspondence:

```json
{
  "type": "fin",
  "header": {
    "correspondenceId": "E1Bqdykdyz9kgdnHQqSSY",
    "subject": "lobbies/join",
    "authorization": "pyrRd5cadGBXm6PnyND_D"
  },
  "body": "SWgvZBYlqhacM6uyWagtg"
}
```

The chosen lobby's ID is included in the message body. And as usual, the session
token is included in the headers to identify the client.

### Oh no

Unfortunately for our client, the Tavern lobby closes every day at 9pm to ease
the moderators' work. And it so happens that by the time the client sent its
request, the Tavern has shut its doors.

Thus, the server replies with an *error message*:

```json
{
  "type": "err",
  "header": {
    "correspondenceId": "E1Bqdykdyz9kgdnHQqSSY",
    "subject": "lobbies/join",
    "authorization": "pyrRd5cadGBXm6PnyND_D"
  },
  "error": {
    "type": "LobbyUnavailable",
    "message": "Unable to join lobby: SWgvZBYlqhacM6uyWagtg"
  }
}
```

An error message is indicated by its *type* field being set to `err`. It also
includes an alternative body, an *error* object. This field has a strict schema,
containing a *type* which is a short, machine-readable indication for the
application, and a *message* which is a human-readable message suitable for
display.

Since this correspondence has encountered an error message, it is considered
closed by both peers and its resources are freed on both sides.

## Sequence diagram

To recap, here's a simple sequence diagram:

![Sequence diagram](http://www.plantuml.com/plantuml/svg/ZLD1Ri8m4Bpx5Nkd-G071ABS49NA2qpOfYwErxKNAB_lsaxIL4gg-f0eripkp6YoZgm3Nrkh51ks28Vzom5sNxhryX7nyugkHgLhfW2R_5IglAiLRAr1nx1Om1Bs9Z9OEfqCHgMQG5SFMt8EQmOc6HLk61J8wLZ2F-RBn9S1Ev5oiYQ-GrreXjnV-2EwCsXPsHW78IcDdF4TgleHM5M2VyNeIIXtm-yY9qQPByekw9wWjXHHzePGGDdqvEvqbd8zWp-ZH6Lkch4ZgAGofz67yYkeAM-3jSvKYi-EI3DoBP47rPlllIVVtZwAwpJW8HfP6nkpiaHICu5DcXpP6R2hhXcPzMoYj_fH5DDRBtgkDgEAwAAlYsd3ZAtdeGok6MF-czi7IJaAPROMGpmOWWXifHgw6JkTDhgfBuxk5i-2LMj1fx_e6m00)
