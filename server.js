const express = require('express')
const path = require('path')
const packageinfo = require('./package.json')
const config = require('./config')(path)
const fs = require('fs')
const exchangeRate = require('./exchangeRate')(path, config, fs)
const app = express()

app.use(express.static(path.join(__dirname, 'public'), {
  extensions: ['html'],
  maxAge: '1h'
}))

// ROUTES
app.get('/info', function (req, res, next) {
  res.jsonp({ name: packageinfo.name, version: packageinfo.version, author: packageinfo.author })
})

app.get('/latest', function (req, res, next) {
  let date = new Date().toISOString().slice(0, 10)
  sendRates(date, req, res, next)
})

app.get('/:date', function (req, res, next) {
  let date = req.params['date']
  let current_date = new Date().toISOString().slice(0, 10)

  if (date.match(/^\d{4}-[01]\d-[0-3]\d$/) && date <= current_date) {
    return sendRates(date, req, res, next)
  }

  next()
})

app.all('*', function (req, res, next) {
  res.status(404)
  res.send({ error: 'Resource not found' })
})

app.listen(config.port, (err) => {
  if (err) return err
  console.log(`Server started on port ${config.port}`)
})

function sendRates (date, req, res, next) {
  let base = req.query.base || 'USD'

  exchangeRate.getRates(base, date, function (error, rates) {
    if (error) {
      return next(error)
    }

    res.jsonp(rates)
  })
}
