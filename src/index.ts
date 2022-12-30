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
} from './commands'
import { getDataset } from './libs/api'
import { EmbedBuilder } from '@discordjs/builders'

const webhookClient = new WebhookClient({
  url: 'https://discord.com/api/webhooks/1058200519950209085/cqvlmo7lP_IGMqMxKfcWac-xyhvgQevvz8YaBDDxBSiKW1qZr8GwXNJd298v4HPsKMyC'
})

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
  if (env.ERRORS_WEBHOOK_URL) {
    const embed = new EmbedBuilder()
      .setTitle('unhandledRejection')
      .setDescription(`${error}`)
      .setColor(Colors.Red)

    webhookClient.send({ embeds: [embed], content: '<@87250779408187392>' })
  } else {
    console.error(error)
  }
})

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, exiting gracefully.')
  process.exit()
})

main()
