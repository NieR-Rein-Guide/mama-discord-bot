const client = require('./libs/client')
const { emojis, formatRegex } = require('./config');
const { MessageEmbed } = require('discord.js');

client.once('ready', () => console.log('Bot is connected.'))

client.on('messageCreate', async (message) => {
  try {
    const matches = [...message.content.matchAll(formatRegex)]

    if (matches.length > 0 ) {
      for (const match of matches) {
        const reference = match[0].replaceAll('[', '').replaceAll(']', '')

        const embed = new MessageEmbed()
          .setTitle(`${reference}`)
          .setDescription(`
            ${emojis.dark} ${emojis.sword} ${emojis.ex}
            \n\n[nierrein.guide](https://nierrein.guide/) • [nier-calc](https://nier-calc.com/)
          `.trim())
          .setThumbnail('https://nierrein.guide/_next/image?url=%2Fui%2Fweapon%2Fwp001504_full.png&w=1920&q=75')

        message.channel.send({ embeds: [embed] })
      }
    }
  } catch (error) {
    console.error(error)
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)
