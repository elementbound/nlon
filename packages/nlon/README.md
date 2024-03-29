# nlon

This package is the reference implementation of the [nlon protocol](../../).

## Install

- pnpm: `pnpm add @elementbound/nlon`
- npm: `npm i @elementbound/nlon`
- yarn: `yarn add @elementbound/nlon`

## Usage

For a more detailed explanation, see the [nlon documentation](../../#documentation)

### Server

```js
import { createSocketServer } from '@elementbound/nlon-socket'

const nlonServer = createSocketServer({
  host: 'localhost',
  port: 63636
})

nlonServer.handle('greet', (peer, correspondence) => {
  correspondence.finish('Bye!')
})
```

### Peer

```js
import { Message, MessageHeader } from '@elementbound/nlon'
import { createSocketPeer } from '@elementbound/nlon-socket'

async function getGreeting () {
  const nlonPeer = createSocketPeer({
    host: 'localhost',
    port: 63636
  })

  const correspondence = nlonPeer.send(new Message({
    header: new MessageHeader({
      subject: 'greet'
    }),

    body: 'Hello!'
  }))

  const response = await correspondence.next()
  console.log('Received response:', response)

  correspondence.finish()
}
```

## Documentation

- [API docs](https://elementbound.github.io/nlon/reference/nlon/)
  - Or generate your own with JSDoc: `pnpm doc`

## License

This package is under the [MIT License](../../LICENSE).
