const client = require('./libs/client')
const { emojis, formatRegex, icons, redditGuildId, redditGuildAllowedRoleId } = require('./config');
const { MessageEmbed } = require('discord.js');
const Reference = require('./models/Reference')
const api = require('./libs/api')
const urlSlug = require('url-slug')
const Fuse = require('fuse.js')

// Blacklist
const blacklist = new Map()
// Cleared every hour
setInterval(() => {
  blacklist.clear()
}, 3600000)

// Dataset
let costumes = []
let weapons = []
let costumesSearch = null
let weaponsSearch = null
getDataset()

client.once('ready', () => console.log('Bot is connected.'))

client.on('messageCreate', async (message) => {
  if (blacklist.has(message.author.id)) {
    return
  }

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

        // An alias has been found in the database, use it in priority
        if (reference) {
          reference.use_count = reference.getDataValue('use_count') + 1
          reference.save().catch(console.error)

          if (reference.getDataValue('type') === 'weapon') {
            const { data } = await api.get('/weapon', {
              params: {
                id: reference.item_id
              }
            })

            const embed = getWeaponEmbed(data)

            message.channel.send({ embeds: [embed] })
          }

          if (reference.getDataValue('type') === 'costume') {
            const { data } = await api.get('/costume', {
              params: {
                id: reference.item_id
              }
            })

            const embed = getCostumeEmbed(data)

            message.channel.send({ embeds: [embed] })
          }

          continue
        }

        // If no alias has been found, try finding it with fuzzy search
        const [costumeResult] = costumesSearch.search(alias)
        const [weaponResult] = weaponsSearch.search(alias)

        if (alias.includes('weap') || alias.includes('wep')) {
          if (weaponResult) {
            const embed = getWeaponEmbed(weaponResult.item)

            message.channel.send({ embeds: [embed] })
          } else {
            message.reply(`I am so sorry, Mama couldn't find a weapon with the name "${alias}".`)
          }

          continue
        }

        if (costumeResult) {
          const embed = getCostumeEmbed(costumeResult.item)

          message.channel.send({ embeds: [embed] })
        } else {
          if (weaponResult) {
            const embed = getWeaponEmbed(weaponResult.item)

            message.channel.send({ embeds: [embed] })
          } else {
            message.reply(`I am so sorry, Mama couldn't find anything useful from ${alias}.`)

            Reference.create({
              alias,
              use_count: 1
            }).catch(console.error)
            console.log(`Created reference: "${alias}"`)
          }
        }

        continue
      }
    }
  } catch (error) {
    console.error(error)
  }
})

async function getDataset() {
  console.log('Fetching dataset')
  const [allWeapons, allCostumes] = await Promise.all([
    api.get('/weapons'),
    api.get('/costumes'),
  ])
  weapons = allWeapons.data
  costumes = allCostumes.data

  console.log('Dataset is ready')

  costumesSearch = new Fuse(costumes, {
    keys: ['character.en', 'costume.name.en']
  })

  weaponsSearch = new Fuse(weapons, {
    keys: ['name.en']
  })

  client.login(process.env.DISCORD_BOT_TOKEN)
}

function getWeaponEmbed(data) {
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

  return embed
}

function getCostumeEmbed(data) {
  const embed = new MessageEmbed()
    .setTitle(`${data?.character?.en} - ${data.costume.name.en}`)
    .setDescription(`See more on [nierrein.guide](https://nierrein.guide/characters/${urlSlug(data.character.en)}/${urlSlug(data.costume.name.en)}) • [nier-calc](https://nier-calc.com/unit/${urlSlug(data.costume.name.en)})
    `.trim())
    .setThumbnail(`https://nierrein.guide/character/thumbnails/${data.ids.actor}_thumbnail.png`)

  return embed
}