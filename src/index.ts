import { env } from './env'

// Setup Discord
import Bot from './Bot'
import client from './libs/client'

// Commands
import {
  Help,
  Costume,
  Weapon,
} from './commands'
import { getDataset } from './libs/api'


async function main() {
  const bot = new Bot(client, env.DISCORD_BOT_TOKEN)

  const {
    costumes, costumesSearch,
    weapons, weaponsSearch
  } = await getDataset()

  bot
    .addCommand(new Help())
    .addCommand(new Costume(costumes, costumesSearch))
    .addCommand(new Weapon(weapons, weaponsSearch))
    .run()
}

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error)
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, exiting gracefully.')
  process.exit()
})

main()
