import { env } from './env'

// Setup Discord
import Bot from './Bot'
import client from './libs/client'

// Commands
import {
  Help,
  Costume,
} from './commands'

const bot = new Bot(client, env.DISCORD_BOT_TOKEN)

bot
  .addCommand(new Help())
  .addCommand(new Costume())
  .run()

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, exiting gracefully.')
  bot.client.destroy()
  process.exit()
})