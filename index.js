const client = require('./libs/client')
const { emojis, formatRegex, icons } = require('./config');
const { MessageEmbed } = require('discord.js');
const Reference = require('./models/Reference')
const api = require('./libs/api')
const urlSlug = require('url-slug')

// Blacklist
const blacklist = new Map()
// Cleared every hour
setInterval(() => {
  blacklist.clear()
}, 3600000)

client.once('ready', () => console.log('Bot is connected.'))

client.on('messageCreate', async (message) => {
  try {
    let matches = [...message.content.matchAll(formatRegex)]

    // If the user is using too much references at once, add to temp blacklist
    if (matches.length > 3) {
      if (blacklist.has(message.author.id)) {
        const count = blacklist.get(message.author.id)
        blacklist.set(message.author.id, count + 1)

        if (count >= 2) {
          return message.reply(`${message.member}, Mama is not happy. Please don't spam the channel with too many references at once! Max is 3 per message.`)
        }
      } else {
        blacklist.set(message.author.id, 0)
      }

      // Truncate the matches to 3 to avoid spam
      matches = matches.slice(0, 3);
    }

    if (matches?.length > 0 ) {
      for (const match of matches) {
        const alias = match[0].replaceAll('[', '').replaceAll(']', '').trim()

        const reference = await Reference.findOne({ where: {
          alias
        }})

        if (!reference) {
          message.reply(`Sorry, the alias \`${alias}\` does not exist yet in the database. Please create it.`)

          Reference.create({
            alias,
            use_count: 1
          }).catch(console.error)
          console.log(`Created reference: "${alias}"`)

          continue
        }

        reference.use_count = reference.getDataValue('use_count') + 1
        reference.save().catch(console.error)

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
