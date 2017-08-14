// International Monetary Fund

const cheerioReq = require('cheerio-req')

module.exports = exports = function (path, config, fs) {
  const IMF = {
    'currencies': function () {
      return Object.values(IMF.conversionTable())
    },

    'conversionTable': function () {
      return {
        'Chinese Yuan': 'CNY',
        'Euro': 'EUR',
        'Japanese Yen': 'JPY',
        'U.K. Pound Sterling': 'GBP',
        'U.S. Dollar': 'USD',
        'Algerian Dinar': 'DZD',
        'Australian Dollar': 'AUD',
        'Bahrain Dinar': 'BHD',
        'Botswana Pula': 'BWP',
        'Brazilian Real': 'BRL',
        'Brunei Dollar': 'BND',
        'Canadian Dollar': 'CAD',
        'Chilean Peso': 'CLP',
        'Colombian Peso': 'COP',
        'Czech Koruna': 'CZK',
        'Danish Krone': 'DKK',
        'Hungarian Forint': 'HUF',
        'Icelandic Krona': 'ISK',
        'Indian Rupee': 'INR',
        'Indonesian Rupiah': 'IDR',
        'Iranian Rial': 'IRR',
        'Israeli New Sheqel': 'ILS',
        'Kazakhstani Tenge': 'KZT',
        'Korean Won': 'KRW',
        'Kuwaiti Dinar': 'KWD',
        'Libyan Dinar': 'LYD',
        'Malaysian Ringgit': 'MYR',
        'Mauritian Rupee': 'MUR',
        'Mexican Peso': 'MXN',
        'Nepalese Rupee': 'NPR',
        'New Zealand Dollar': 'NZD',
        'Norwegian Krone': 'NOK',
        'Rial Omani': 'OMR',
        'Pakistani Rupee': 'PKR',
        'Nuevo Sol': 'PEN',
        'Philippine Peso': 'PHP',
        'Polish Zloty': 'PLN',
        'Qatar Riyal': 'QAR',
        'Russian Ruble': 'RUB',
        'Saudi Arabian Riyal': 'SAR',
        'Singapore Dollar': 'SGD',
        'South African Rand': 'ZAR',
        'Sri Lanka Rupee': 'LKR',
        'Swedish Krona': 'SEK',
        'Swiss Franc': 'CHF',
        'Thai Baht': 'THB',
        'Trinidad And Tobago Dollar': 'TTD',
        'Tunisian Dinar': 'TND',
        'U.A.E. Dirham': 'AED',
        'Peso Uruguayo': 'UYU',
        'Bolivar Fuerte': 'VEB'
      }
    },

    'getRates': function (date, callback) {
      let json_callback = function (error, json) {
        if (error) {
          return callback(error)
        }

        json = IMF.correctNArates(json)

        callback(null, json)
      }

      IMF.checkCached(date, function (exists, json) {
        if (!exists) {
          IMF.updateRates(date, callback, json_callback)
        } else {
          IMF.loadCached(date, function (error, json) {
            if (json && !json[date]) {
              return IMF.updateRates(date, callback, json_callback)
            }

            json_callback(error, json)
          })
        }
      })
    },

    'updateRates': function (date, callback, json_callback) {
      let url = `https://www.imf.org/external/np/fin/data/rms_mth.aspx?SelectDate=${date}&reportType=CVSDR`

      cheerioReq(url, (error, $) => {
        if (error) {
          return callback(error)
        }

        IMF.tableToJSON($, date, function (error, json) {
          if (error) {
            return callback(error)
          }

          IMF.saveCached(date, json, json_callback)
        })
      })
    },

    'tableToJSON': function ($, date, callback) {
      let $tables = $('#container').find('table:has(td:contains("Chinese Yuan"))')

      let dates = []
      let json = {}
      $($tables).each(function (i, elem) {
        $(this).children().each(function (i, elem) {
          let columns = $(this).children()
          let legend = columns.eq(0)

          if (legend.get(0).tagName === 'th') {
            if (IMF.removeWhitespace(legend.text()) === 'Currency') {
              columns.slice(1).each(function (i, elem) {
                dates[i] = IMF.convertDateStringToISO($(elem).text())
              })
            }

            if (!dates.indexOf(date) === -1) {
              return callback(new Error(`Couldn't find date ${date}`))
            }
          } else if (legend.get(0).tagName === 'td') {
            let currency = IMF.convertCurrencyStringToISO(legend.text())

            columns.slice(1).each(function (i, elem) {
              if (!json[dates[i]]) {
                json[dates[i]] = {}
              }

              let rate = IMF.removeWhitespace($(elem).text())

              json[dates[i]][currency] = rate
            })
          }
        })
      })

      callback(null, json)
    },

    'convertCurrencyStringToISO': function (string) {
      string = IMF.removeWhitespace(string)

      let conversions = IMF.conversionTable()

      if (conversions[string]) {
        return conversions[string]
      }

      return string
    },

    'convertDateStringToISO': function (string) {
      return new Date(Date.parse(IMF.removeWhitespace(string))).toISOString().slice(0, 10)
    },

    'removeWhitespace': function (string) {
      return string.replace(/^([\r|\n| ]*)?(.*)([\r|\n| ]*)?$/, '$2')
    },

    'correctNArates': function (json) {
      let dates_in_reverse = Object.keys(json).sort(function (a, b) { return a < b })

      for (let i = 0; i < dates_in_reverse.length; i++) {
        let date = dates_in_reverse[i]

        for (let currency in json[date]) {
          if (json[date][currency] === 'NA') {
            for (let earlier_date of dates_in_reverse.slice(i + 1)) {
              if (json[earlier_date][currency] !== 'NA') {
                json[date][currency] = json[earlier_date][currency]
                break
              }
            }
          }
        }
      }

      return json
    },

    'checkCached': function (date, callback) {
      var file_path = IMF.getFilePath(date)

      fs.exists(file_path, function (exists) {
        callback(exists, file_path)
      })
    },

    'loadCached': function (date, callback) {
      var file_path = IMF.getFilePath(date)

      try {
        callback(null, require(file_path))
      } catch (error) {
        callback(error)
      }
    },

    'getFilePath': function (date) {
      date = date.slice(0, 7)
      return `${config.cache_folder_path}/IMF/${date}.json`
    },

    'saveCached': function (date, json, callback) {
      let file_path = IMF.getFilePath(date)
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

  return IMF
}
