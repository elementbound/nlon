import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs/promises'
import pino from 'pino'
import { Server } from '../../lib/server.mjs'
import { InspectableStream } from '../inspectable.stream.mjs'
import { Message, MessageHeader, MessageTypes } from '../../lib/protocol.mjs'
import { send } from '../utils.mjs'

const logger = pino({ name: 'test' })
const correspondenceCount = process.env.TEST_CORRESPONDENCES ?? 1024

function formatBytes (bytes) {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

  while (bytes > 1024 && units.length > 1) {
    bytes /= 1024
    units.shift()
  }

  bytes = Math.round(bytes * 100) / 100
  return `${bytes} ${units[0]}`
}

function requestGC () {
  try {
    global.gc()
    return true
  } catch (e) {
    // Do nothing - GC probably not available
    return false
  }
}

async function saveSamples (filename, samples) {
  const file = await fs.open(filename, 'w')

  await file.write('sample, memory\n')
  for (const [idx, memory] of samples.map((v, i) => [i, v])) {
    await file.write(`${idx}, ${memory}\n`)
  }

  await file.close()
}

test('serial correspondences should keep memory usage', async () => {
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
      logger.info('Memory usage at %s', formatBytes(ram))
      requestGC()
    }
  }

  // Then
  const increaseBytes = maxRam - baselineRam
  const increasePercent = increaseBytes / baselineRam
  logger.info('Baseline memory usage: %s', formatBytes(baselineRam))
  logger.info('Highest memory usage: %s', formatBytes(maxRam))
  logger.info('Increase: %s or %d percent',
    formatBytes(increaseBytes), increasePercent * 100)

  try {
    logger.info('Saving samples')
    saveSamples('serial.correspondences.perf.log', ramSamples)
  } catch (err) {
    logger.warn({ err }, 'Failed to save perf report')
  }

  assert(increaseBytes < 10 * 1024 * 1024,
    'Memory usage increased more than 10MiB!')
})
