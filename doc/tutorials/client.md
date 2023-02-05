# Implementing a client

NLON clients are responsible for initiating correspondences. Compared to a
traditional HTTP client, the difference is that you don't get a response object
directly - instead, you get a correspondence, which you can use to stream your
input data to the server if needed, and to process responses.

## Setting up the client

The first step is to create a client instance. To do that, we first need to
create a connection that the client can use. This is required because NLON
itself is not tied to any specific transport, so this must be handled
externally. This can be done by an adapter ( TODO: implement ), or manually.

Let's take a TCP socket for example:

```js
const tcpSocket = net.createConnection({
  host: 'nlon.example.com',
  port: 49494
})

const nlonClient = new Client(tcpSocket)
```

From this point on, the client can be used to initiate correspondences and
listen for incoming ones.

## Initiating a correspondence

The next logical step would be to send some messages, for example to request
some data. This can be done by using the `.send()` method:

```js
const message = new Message({
  header: new MessageHeader({
    subject: 'echo'
  }),

  body: 'Hello world!'
})

const correspondence = nlonClient.send(message)
```

First off, the message must be created. The best way to do that is to create a
`Message` instance and pass all the necessary data to its constructor. Same is
done with the `MessageHeader`.

> You can also manually assemble your message object, but it must conform to the
> NLON message format. This includes generating your own correspondence ID,
> which is usually done automatically by the `MessageHeader` constructor if none
> is provided.

The next step is to simply send the message. In return, we get a correspondence
that we can use to grab the response. You can use `.next()` to do that:

```js
const response = await correspondence.next()

console.log(response) // 'Hello world!'
```

The above only waits for the first piece of data. This is good for cases where
it's known in advance that only a single piece of data will arrive / is needed.

### Streaming responses

In case the response is expected to arrive in multiple pieces, for example
because it's a large amount of data, there's two options.

The first would be to subscribe to the correspondence's data events:

```js
correspondence.on('data', (chunk, isFinish) => doSomething(chunk))
```

> If the finish message arrives with a piece of data attached, first a `data`,
> then a `finish` message is emitted, so the `data` event handlers run for every
> single piece of data. In that case, the `isFinish` parameter will be true for
> the callback, otherwise it's always false.

Alternatively, you can loop over the incoming messages like so:

```js
while (correspondence.readable) {
  const chunk = await correspondence.next()

  // We've received a `finish` message without data
  if (chunk === Correspondence.End)
    break

  doSomething(chunk)
}
```

Coincidentally, this is exactly what `.all()` does, but more conveniently:

```js
for await (const chunk of correspondence.all()) {
  doSomething(chunk)
}
```

### Error handling

Using `.next()` or `.all()` will reject with an error if an error message is
received during the correspondence.

## Incoming correspondences

Since NLON is a bidirectional protocol, the server can initiate a new
correspondence at any time as well. To handle these, there's two options.

Firstly, you can subscribe to incoming correspondences via an event handler:

```js
client.on('correspondence', async correspondence => {
  doSomething(correspondence)
})
```

Alternatively, if you are implementing a logical flow of correspondences, you
might find `.receive()` useful:

```js
const loginCorrespondence = client.send(new Message({
  header: new MessageHeader({
    subject: 'login'
  }),

  body: {
    username, password
  }
}))

try {
  const loginResponse = await loginCorrespondence.next()
} catch (e) {
  console.error('Login failed!')
  return
}

const welcomeCorrespondence = await client.receive()
const welcomeMessage = await welcomeCorrespondence.next()

console.log('Server welcome message:', welcomeMessage)
```

Here, after sending a login message, we know in advance that right after that
the server will send us a welcome message. We can grab this with the
`.receive()` method, which will return the first server-initiated correspondence
that arrives.

Once you've acquired a correspondence, you can handle it the same way as
presented in the previous section of 'Initiating a correspondence'.

> The two approaches documented here can end up clashing - if you register a
> `correspondence` event handler AND wait for a correspondence with
> `.receive()`, the handler method will run for the correspondence returned by
> `.receive()`. If you consume messages in the event handler, you won't be able
> to use the same message on the correspondence and vice versa.
