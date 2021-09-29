const { Client, Intents } = require('discord.js')

const client = new Client({
  intents: new Intents([
    'GUILDS',
    'GUILD_MESSAGES',
  ])
})

module.exports = client