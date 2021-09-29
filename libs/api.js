const axios = require('axios')

const api = axios.create({
  baseURL: 'https://nierrein.guide/api/',
  timeout: 10 * 1000,
});

module.exports = api