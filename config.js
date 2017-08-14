// const path = require('path')

module.exports = exports = function (path) {
  var node_env = process.env.NODE_ENV || 'production'
  var config = require(`./config/${node_env}.json`)
  config.env = node_env
  config.cache_folder_path = config.cache_folder_path || path.join(__dirname, 'cache')
  config.port = config.port || process.env.PORT || 8080
  return config
}
