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

## Handling requests

Each message has a *subject* in its header. This is used to route the message to
the appropriate request handler for processing, for example:

```js
nlonServer.handle('echo', (request, response) => {
  response.write(request.body)
})
```

This will simply echo any incoming data back at the sender. However, using this
as-is would result in an `UnfinishedResponseError`. This happens because the
response, in fact, was not finished. Finishing a response signifies to the
recipient that the correspondence is finished and no more data should be
expected on it. To fix that, simply call `.finish()`:

```js
nlonServer.handle('echo', (request, response) => {
  response.write(request.body)
  response.finish()
})
```

Note that NLON correspondences can also be finished with a piece of data, so the
above is practically equal to the following:

```js
nlonServer.handle('echo', (request, response) => {
  response.finish(request.body)
})
```

> The difference between the two snippets is that the latter sends a
> single message with a piece of data, while the former sends a data message and
> then a finish message without data.

## Composing handlers

Let's say you have some additional aspect you want to take care of, but don't
want to pollute your original handler code with it. Maybe it's something that
repeats even.

Take the following example, where you want to write a handler that:

1. Requires that the request has an authorization header
1. Looks up the user based on the header
1. Replies with all of the user's friends

Naively, this could be done like so:

```js
nlonServer.handle('friends', (request, response) => {
  // Check if auth header present
  if (!request.header.authorization) {
    response.error(new MessageError({
      type: 'Unauthorized',
      message: 'Authorization header missing!'
    }))
    return
  }

  // Check if auth header valid
  const user = userRepository.findByAuth(request.header.authorization)
  if (!user) {
    response.error(new MessageError({
      type: 'Unauthorized',
      message: 'Unknown user!'
    }))
    return
  }

  // Reply with friends
  user.friends.forEach(friend => response.write(friend.name))
  response.finish()
})
```

This could be OK for a single handler, but if you need the same auth header
checking functionality in multiple places, it could get out of hand. Let's break
it up into multiple handlers instead:

```js
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

nlonServer.handle('friends',
  requireAuth(),
  requireUser(),
  (request, response, context) => {
    const user = context.user

    // Reply with friends
    user.friends.forEach(friend => response.write(friend.name))
    response.finish()
  }
)
```

Let's take a look at what happened. 

First, the reusable parts were moved to separate functions, returning request
handlers. This is analogous with Express middlewares. It is convention to return
functions, since these 'middlewares' can be parameterized for each subject.

Another addition was a `context` parameter - this starts as an empty object and
can be freely populated by the handlers. This context object is tied to a single
correspondence. In the above example, we can store our resolved user in it for
further use.

Lastly, we just register multiple handlers to the same subject. When a message
comes in, each handler is called in order of registration. If any of the
handlers finish the response either by calling `.finish()` or `.error()`, the
subsequent handlers will not be called.

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
  server.handle('friends',
    requireAuth(),
    requireUser(),
    (request, response, context) => {
      const user = context.user

      // Reply with friends
      user.friends.forEach(friend => response.write(friend.name))
      response.finish()
    }
  )
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
