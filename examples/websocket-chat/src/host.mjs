import express from 'express'
import pino from 'pino'

const app = express()
const logger = pino()
const port = process.env.PORT ?? 3000

app.use((req, res, next) => {
  logger.info({
    path: req.path,
    params: req.params,
    headers: req.headers,
    method: req.method,
    ip: req.ip
  }, 'Incoming request')

  next()
})

app.get('/', (req, res) => {
  res.send('Hello world!')
})

app.listen(port, () => {
  logger.info(`Listening on port ${port}`)
})
