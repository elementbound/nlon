const wsTarget = `ws://${window.location.host}/`

console.log('Connecting to', wsTarget)
const ws = new WebSocket(wsTarget)
