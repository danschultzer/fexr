module.exports = exports = function (path, config, fs) {
  const banks = [
    require('./exchange_banks/IMF')(path, config, fs),
    require('./exchange_banks/NBU')(path, config, fs)
  ]
  const ExchangeRate = {
    'getRates': function (base, date, callback) {
      ExchangeRate.checkCached(base, date, function (has_cache, file_path) {
        if (has_cache) {
          return ExchangeRate.parseJSON(file_path, callback)
        }

        ExchangeRate.updateRates(base, date, function (error, file_path) {
          if (error) {
            return callback(error)
          }

          return ExchangeRate.parseJSON(file_path, callback)
        })
      })
    },

    'checkCached': function (base, date, callback) {
      var file_path = ExchangeRate.getFilePath(base, date)

      fs.exists(file_path, function (exists) {
        callback(exists, file_path)
      })
    },

    'getFilePath': function (base, date) {
      return `${config.cache_folder_path}/${base}/${date}.json`
    },

    'parseJSON': function (file_path, callback) {
      try {
        return callback(null, require(file_path))
      } catch (error) {
        return callback(error)
      }
    },

    'updateRates': function (base, date, callback) {
      let promises = banks.map(function (bank) {
        return new Promise(function (resolve, reject) {
          bank.getRates(date, function (error, json) {
            if (error) {
              return reject(error)
            }

            resolve(json[date])
          })
        })
      })

      Promise.all(promises).then(function (array) {
        array = array.reverse()
        array.unshift({})

        let json = Object.assign.apply(this, array)

        if (Object.keys(json).length < 1) {
          return callback(new Error(`The date ${date} is not support`))
        }

        if (!json[base]) {
          return callback(new Error(`Currency ${base} is not supported`))
        }

        json = ExchangeRate.adjustToBaseCurrency(base, json)

        ExchangeRate.saveCached(base, date, json, callback)
      }).catch(function (error) {
        callback(error)
      })
    },

    'adjustToBaseCurrency': function (base, json) {
      for (let currency in json) {
        json[currency] = json[currency] / json[base]
      }

      return json
    },

    'saveCached': function (base, date, json, callback) {
      let file_path = ExchangeRate.getFilePath(base, date)
      let dir = path.dirname(file_path)

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
      }

      let content = JSON.stringify(json)

      fs.writeFile(file_path, content, function (error) {
        callback(error, file_path)
      })
    }
  }

  return ExchangeRate
}
