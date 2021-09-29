const client = require('./libs/client')
const { emojis, formatRegex, icons } = require('./config');
const { MessageEmbed } = require('discord.js');
const Reference = require('./models/Reference')
const api = require('./libs/api')
const urlSlug = require('url-slug')

client.once('ready', () => console.log('Bot is connected.'))

client.on('messageCreate', async (message) => {
  try {
    const matches = [...message.content.matchAll(formatRegex)]

    if (matches?.length > 0 ) {
      for (const match of matches) {
        const alias = match[0].replaceAll('[', '').replaceAll(']', '')

        const reference = await Reference.findOne({ where: {
          alias
        }})

        if (!reference) {
          message.reply(`Sorry, the alias \`${alias}\` does not exist yet in the database. Please create it.`)

          continue
        }

        if (reference.getDataValue('type') === 'weapon') {
          const { data } = await api.get('/weapon', {
            params: {
              id: reference.item_id
            }
          })

          const stats = data.stats[data.stats.length - 1].maxWithAscension.base
          const descStats = `${emojis.hp}${stats.hp} | ${emojis.atk}${stats.atk} | ${emojis.def}${stats.def}`

          const embed = new MessageEmbed()
            .setTitle(data.name.en)
            .setDescription(`
              ${emojis[data.attribute]} ${emojis[data.type]} ${data.isDark ? emojis.ex : ''}
              ${data.isDark ? '' : `\n${descStats}`}
              \n\nSee more on [nierrein.guide](https://nierrein.guide/database/weapons/${urlSlug(data.name.en)}/${data.ids.base}) • [nier-calc](https://nier-calc.com/weapon/${urlSlug(data.name.en)})
            `.trim())
            .setThumbnail(`https://nierrein.guide/weapons_thumbnails/wp${data.ids.asset}_thumbnail.png`)

          message.channel.send({ embeds: [embed] })
        }

        if (reference.getDataValue('type') === 'costume') {
          const { data } = await api.get('/costume', {
            params: {
              id: reference.item_id
            }
          })

          const embed = new MessageEmbed()
            .setTitle(`${data.character.en} - ${data.costume.name.en}`)
            .setDescription(`See more on [nierrein.guide](https://nierrein.guide/characters/${urlSlug(data.character.en)}/${urlSlug(data.costume.name.en)}) • [nier-calc](https://nier-calc.com/unit/${urlSlug(data.costume.name.en)})
            `.trim())
            .setThumbnail(`https://nierrein.guide/character/thumbnails/${data.ids.actor}_thumbnail.png`)

          message.channel.send({ embeds: [embed] })
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)
