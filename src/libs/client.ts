import { Client, IntentsBitField } from 'discord.js'

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds, // We want the 'guildCreate' event.
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ]
})

export default client