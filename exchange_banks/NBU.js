// National Bank of Ukraine

const request = require('request')

module.exports = exports = function (path, config, fs) {
  const NBU = {
    'currencies': function () {
      return ['SAR', 'SGD', 'VND', 'ZAR', 'SEK', 'CHF', 'SYP', 'THB', 'AED',
              'TND', 'TRY', 'TMT', 'EGP', 'GBP', 'USD', 'UZS', 'TWD', 'XOF',
              'XAU', 'XDR', 'XAG', 'XPT', 'XPD', 'EUR', 'PLN', 'BRL', 'TJS',
              'RUB', 'RSD', 'BYN', 'DZD', 'AZN', 'AUD', 'BDT', 'AMD', 'BGN',
              'CAD', 'CLP', 'CNY', 'HRK', 'CZK', 'DKK', 'HKD', 'HUF', 'ISK',
              'INR', 'IDR', 'IRR', 'IQD', 'ILS', 'GEL', 'JPY', 'KZT', 'KRW',
              'KWD', 'KGS', 'LBP', 'LYD', 'MYR', 'MXN', 'MNT', 'MDL', 'MAD',
              'NZD', 'NOK', 'PKR', 'PEN', 'RON', 'UAH']
    },

    'getRates': function (date, callback) {
      NBU.checkCached(date, function (exists, json) {
        if (!exists) {
          NBU.updateRates(date, callback)
        } else {
          NBU.loadCached(date, function (error, json) {
            if (json && !json[date]) {
              return NBU.updateRates(date, callback, json)
            }

            callback(error, json)
          })
        }
      })
    },

    'updateRates': function (date, callback, json = {}) {
      let formatted_date = date.replace(/-/g, '')
      let url = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?date=${formatted_date}&json`

      request.get(url, function (error, response, body) {
        if (error) {
          return callback(error)
        }

        if (response.statusCode !== 200) {
          return callback(new Error(response.statusCode))
        }

        let new_json = JSON.parse(body)
        json = NBU.convertJSON(date, new_json)

        NBU.saveCached(date, json, callback)
      })
    },

    'convertJSON': function (date, json) {
      let xdr = json.filter(function (element) { return element['cc'] === 'XDR' })
      if (xdr.length !== 1) {
        return {}
      }

      let new_json = {}
      new_json[date] = {}
      let xdr_rate = xdr[0]['rate']

      for (let i = 0; i < json.length; i++) {
        new_json[date][json[i]['cc']] = xdr_rate / json[i]['rate']
      }

      new_json[date]['UAH'] = 1 / xdr_rate

      return new_json
    },

    'checkCached': function (date, callback) {
      var file_path = NBU.getFilePath(date)

      fs.exists(file_path, function (exists) {
        callback(exists, file_path)
      })
    },

    'loadCached': function (date, callback) {
      var file_path = NBU.getFilePath(date)

      try {
        callback(null, require(file_path))
      } catch (error) {
        callback(error)
      }
    },

    'getFilePath': function (date) {
      date = date.slice(0, 7)
      return `${config.cache_folder_path}/NBU/${date}.json`
    },

    'saveCached': function (date, json, callback) {
      let file_path = NBU.getFilePath(date)
      let dir = path.dirname(file_path)

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
      }

      let content = JSON.stringify(json)

      fs.writeFile(file_path, content, function (error) {
        callback(error, json)
      })
    }
  }

  return NBU
}
