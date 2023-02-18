import * as http from 'node:http'
import express from 'express'
import pino from 'pino'

const app = express()
const httpServer = http.createServer(app)
const logger = pino()
const port = process.env.PORT ?? 3000

app.use((req, _res, next) => {
  logger.info({
    path: req.path,
    params: req.params,
    headers: req.headers,
    method: req.method,
    ip: req.ip
  }, 'Incoming request')

  next()
})

app.use(express.static('dist'))

app.get('/', (_req, res) => {
  res.send('Hello world!')
})

httpServer.listen(port, () => {
  logger.info(`Listening on port ${port}`)
})
