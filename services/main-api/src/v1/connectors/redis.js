const redis = require('redis');

const { promisify } = require('../utilities/async');

const client = redis.createClient({
    host: process.env.REDIS_ADDRESS,
    port: process.env.REDIS_PORT,
});

module.exports.connect = () => {
  return {
    get : promisify(client.get, client),
    set : promisify(client.set, client)
  }
}
