import { env } from './env'
import { Colors, WebhookClient } from 'discord.js'

// Setup Discord
import Bot from './Bot'
import client from './libs/client'

// Commands
import {
  Help,
  Costume,
  Weapon,
  Compare,
  Search,
} from './commands'
import { getDataset } from './libs/api'
import { EmbedBuilder } from '@discordjs/builders'

const webhookClient = new WebhookClient({
  url: env.ERRORS_WEBHOOK_URL
})

async function main() {
  const bot = new Bot(client, env.DISCORD_BOT_TOKEN)

  const {
    costumes, costumesSearch,
    weapons, weaponsSearch,
    costumesAbilities, weaponsAbilities,
  } = await getDataset()

  bot
    .addCommand(new Help())
    .addCommand(new Costume(costumes, costumesSearch))
    .addCommand(new Weapon(weapons, weaponsSearch))
    .addCommand(new Compare(costumes, weapons, costumesSearch, weaponsSearch))
    .addCommand(new Search(costumes, weapons, costumesAbilities, weaponsAbilities))
    .run()
}

process.on('unhandledRejection', (error) => {
  console.error(error)

  if (env.ERRORS_WEBHOOK_URL) {
    const embed = new EmbedBuilder()
      .setTitle('unhandledRejection')
      .setDescription(`${error}`)
      .setColor(Colors.Red)

    webhookClient.send({ embeds: [embed], content: '<@87250779408187392>' })
  }
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, exiting gracefully.')
  process.exit()
})

main()
