# Implementing a server

Implementing a server is similar to something you would do in Express or
Fastify - the basic principles of registering request handlers and middlewares
apply the same.

> For the tl;dr version, scroll to the bottom where a code example is
> provided.

## Setting up the server

The first step is to create your server instance:

```js
const nlonServer = new Server()
```

What could be striking is that there's no listen method. Since NLON ( and its
reference implementation ) is not tied to any specific transport, network or
otherwise, it by itself doesn't do any connection management. Instead,
connections must be provided, either manually by calling `server.connect()`, or
using an adapter ( TODO: to be implemented ).

For example, you might listen on a TCP socket:

```js
const tcpServer = net.createServer()

tcpServer.on('connection', c => nlonServer.connect(c))
tcpServer.listen()
```

Once this is done, the NLON server will be aware of incoming connections and
receive incoming messages.

> Anything can be passed to `server.connect()`, as long as it works as a
> duplex stream - i.e. it emits `data` events and can be written to with `write`
> and can be piped.

## Handling messages

When any of the connected peers sends a message, first its ID is looked up. If
it is a new correspondence, a Correspondence instance is created for it and
passed to the appropriate correspondence handler. The initial  message's
*subject* header is used to route the correspondence to the right correspondence
handler.

From there, the handler is free to stream incoming data and send replies
accordingly, for example:

```js
nlonServer.handle('echo', async (correspondence) => {
  for async (const message of correspondence.all()) {
    correspondence.write(request.body)
  }
})
```

This will simply echo any incoming data back at the sender. However, using this
as-is would result in an `UnfinishedCorrespondenceError`. This happens because
the correspondence, in fact, was not finished. Finishing a correspondence
signifies to the recipient that no more data should be expected on it. To fix
that, simply call `.finish()`:

```js
nlonServer.handle('echo', async (correspondence) => {
  for async (const message of correspondence.all()) {
    correspondence.write(request.body)
  }

  correspondence.finish()
})
```

Note that NLON correspondences can also be finished with a piece of data, in
case you'd like to add some parting message:

```js
nlonServer.handle('echo', async (correspondence) => {
  for async (const message of correspondence.all()) {
    correspondence.write(request.body)
  }

  correspondence.finish('Bye!')
})
```

> Finishing a correpsondence with data results in a single finish message
> written to the stream, same as finishing without data. This means that
> finishing with data does *not* write a data *and* a finish message to the
> stream.

## Composing functionality

Let's say you have some additional aspect you want to take care of, but don't
want to pollute your original handler code with it. Maybe it's something that
repeats even.

Take the following example, where you want to write a handler that:

1. Requires that the request has an authorization header
1. Looks up the user based on the header
1. Replies with all of the user's friends

Naively, this could be done like so:

```js
nlonServer.handle('friends', async (correspondence) => {
  const request = await correspondence.next()

  // Check if auth header present
  if (!request.header.authorization) {
    correspondence.error(new MessageError({
      type: 'Unauthorized',
      message: 'Authorization header missing!'
    }))
    return
  }

  // Check if auth header valid
  const user = userRepository.findByAuth(request.header.authorization)
  if (!user) {
    correspondence.error(new MessageError({
      type: 'Unauthorized',
      message: 'Unknown user!'
    }))
    return
  }

  // Reply with friends
  user.friends.forEach(friend => correspondence.write(friend.name))
  correspondence.finish()
})
```

This could be OK for a single handler, but if you need the same auth header
checking functionality in multiple places, it could get out of hand. Let's break
it up into multiple handlers instead:

```js
function requireAuth() {
  return (data, header, context) => {
    if (!header.authorization) {
      throw new CorrespondenceError(new MessageError({
        type: 'Unauthorized',
        message: 'Authorization header missing!'
      }))
    }
  }
}

function requireUser() {
  return (data, header, context) => {
    const user = userRepository.findByAuth(header.authorization)
    if (!user) {
      throw new CorrespondenceError(new MessageError({
        type: 'Unauthorized',
        message: 'Unknown user!'
      }))
    } else {
      context.user = user
    }
  }
}

nlonServer.handle('friends', async (correspondence) => {
  const request = await correspondence.next(
    requireAuth(),
    requireUser()
  )

  const { user } = correspondence.context

  // Reply with friends
  user.friends.forEach(friend => correspondence.write(friend.name))
  correspondence.finish()
})
```

Let's take a look at what happened. 

First, the reusable parts were moved to separate functions, returning read
handlers. This is analogous with Express middlewares. It is convention to return
functions, since these 'middlewares' can be parameterized for each subject.

Another addition was a `context` parameter - this starts as an empty object and
can be freely populated by the handlers. This context object is tied to a single
read operation - i.e. `.next()` or each iteration of `.all()`. In the above
example, we can store our resolved user in it for further use.

Lastly, we just pass multiple read handlers to our read operation - `.next()` in
this case. When a message comes in, each handler is called in order of
registration. If any of the handlers throw, the exception will be passed to the
exception handlers. The default exception handler will process it and write an
error response to the stream.

## Grouping handlers

As your application starts to grow, you will probably want to split up your
project into multiple files, instead of a single large `index.js`. To facilitate
splitting handlers in a sane manner, a `.configure()` method is provided. This
takes a method that receives the server itself. This way the code registering
handlers doesn't actually need to know about the server.

Let's say we move our previous handler code to `handlers.mjs`, and keep our
server code in `index.mjs`.

To expose our handlers, we can package them into a function:

```js
// handlers.mjs
function requireAuth() {
  return (request, response, context) => {
    if (!request.header.authorization) {
      response.error(new MessageError({
        type: 'Unauthorized',
        message: 'Authorization header missing!'
      }))
    }
  }
}

function requireUser() {
  return (request, response, context) => {
    const user = userRepository.findByAuth(request.header.authorization)
    if (!user) {
      response.error(new MessageError({
        type: 'Unauthorized',
        message: 'Unknown user!'
      }))
    } else {
      context.user = user
    }
  }
}

export function friendsHandlers(server) {
  nlonServer.handle('friends', async (correspondence) => {
    const request = await correspondence.next(
      requireAuth(),
      requireUser()
    )

    const { user } = correspondence.context

    // Reply with friends
    user.friends.forEach(friend => correspondence.write(friend.name))
    correspondence.finish()
  })
}
```

And then register our handlers:

```js
// index.mjs
import { friendsHandlers } from './handlers.mjs'

const nlonServer = new Server()
const tcpServer = net.createServer()

nlonServer.configure(friendsHandlers)

tcpServer.on('connection', c => server.connect(c))
tcpServer.listen()
```
