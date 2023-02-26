import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import pino from 'pino'
import { Server } from '../../lib/server.mjs'
import { InspectableStream } from '../inspectable.stream.mjs'
import { Message, MessageHeader, MessageTypes } from '../../lib/protocol.mjs'
import { send } from '../utils.mjs'

const logger = pino({ name: 'test' })
const correspondenceCount = process.env.TEST_CORRESPONDENCES ?? 1024

test('serial correspondences should keep memory usage', async t => {
  // Given
  logger.info('Setting up server')
  const stream = new InspectableStream()
  const server = new Server()
  server.connect(stream)

  server.handle('test', (_peer, correspondence) =>
    correspondence.finish()
  )

  const baselineRam = process.memoryUsage().rss
  const ramSamples = []
  let maxRam = baselineRam

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

    const ram = process.memoryUsage().rss
    ramSamples.push(ram)
    maxRam = Math.max(maxRam, ram)
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

  assert(increasePercent < 0.15, 'Memory usage increased more than 15%!')
  assert(increaseBytes < 5 * 1024 * 1024, 'Memory usage increased more than 5MB!')
})
