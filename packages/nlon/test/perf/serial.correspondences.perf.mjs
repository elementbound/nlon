import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import pino from 'pino'
import { Server } from '../../lib/server.mjs'
import { InspectableStream } from '../inspectable.stream.mjs'
import { Message, MessageHeader, MessageTypes } from '../../lib/protocol.mjs'
import { send } from '../utils.mjs'
import { Duplex } from 'node:stream'

const logger = pino({ name: 'test' })
const correspondenceCount = process.env.TEST_CORRESPONDENCES ?? 1024

function requestGC () {
  try {
    global.gc()
    return true
  } catch (e) {
    // Do nothing - GC probably not available
    return false
  }
}

test('serial correspondences should keep memory usage', async t => {
  // Given
  logger.info('Setting up server')
  const stream = new InspectableStream({
    recordWrites: false
  })
  const server = new Server()
  server.connect(stream)

  server.handle('test', (_peer, correspondence) =>
    correspondence.finish()
  )

  const gcInterval = 128
  const baselineRam = process.memoryUsage().rss
  const ramSamples = []
  let maxRam = baselineRam

  if (!requestGC()) {
    logger.warn(
      'GC is not available, test might fail! Use the `--expose-gc` flag'
    )
  }

  // When
  logger.info('Starting test with %d serial correspondences',
    correspondenceCount)

  for (let i = 0; i < correspondenceCount; ++i) {
    const startMessage = new Message({
      header: new MessageHeader({ subject: 'test' }),
      type: MessageTypes.Data
    })

    const finishMessage = new Message({
      ...startMessage,
      type: MessageTypes.Finish
    })

    await send(stream, startMessage)
    await send(stream, finishMessage)
    stream.extract() // Discard recorded writes

    const ram = process.memoryUsage().rss
    ramSamples.push(ram)
    maxRam = Math.max(maxRam, ram)

    if (i % gcInterval === 0) {
      logger.info('Requesting GC at correspondence#%d - %d%%',
        i, ((i + 1) / correspondenceCount) * 100)
      logger.info('Memory usage at %d mb', ram / 1024 / 1024)
      requestGC()
    }
  }

  // Then
  const increaseBytes = maxRam - baselineRam
  const increasePercent = increaseBytes / baselineRam
  logger.info('Baseline memory usage: %d bytes', baselineRam)
  logger.info('Highest memory usage: %d bytes', maxRam)
  logger.info('Increase: %d bytes or %d percent',
    increaseBytes, increasePercent * 100)

  try {
    logger.info('Saving samples')
    fs.writeFileSync('serial.perf.log',
      'sample, usage\n' +
      ramSamples
        .map((v, i) => `${i}, ${v}`)
        .join('\n')
    )
  } catch (err) {
    logger.warn({ err }, 'Failed to save perf report')
  }

  assert(increaseBytes < 10 * 1024 * 1024,
    'Memory usage increased more than 10MB!')
})
