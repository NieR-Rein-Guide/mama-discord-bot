import client from './libs/client'
import api from './libs/api'
import { emojis, formatRegex, RARITY, WEAPON_TYPE } from './config'
import { MessageEmbed } from 'discord.js';
import urlSlug from 'slugg'
import Fuse from 'fuse.js'
import { prisma, PrismaClient } from '@prisma/client'
import { Message } from 'discord.js';
import { ApiCostume } from '..';

const CDN_URL = "https://s3.eu-central-1.wasabisys.com/nierreincarnation/"

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

client.on('messageCreate', async (message: Message) => {
  if (message.author.bot || blacklist.has(message.author.id)) {
    return
  }

  const prisma = new PrismaClient()

  try {
    let matches = [...message.content.matchAll(formatRegex)]

    // If the user is using too much references at once, add to temp blacklist
    if (matches.length > 3) {
      if (blacklist.has(message.author.id)) {
        const count = blacklist.get(message.author.id)
        blacklist.set(message.author.id, count + 1)

        if (count >= 4) {
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

        // Do not support weapons yet.
        if (alias.toLowerCase().includes('weap') || alias.toLowerCase().includes('wep')) {
          const embed = new MessageEmbed()
            .setTitle('Sorry, weapons are not supported yet.')

            message.reply({
            embeds: [embed]
          })

          continue
        }

        // First step is to try to find a specific reference
        const reference = await prisma.references.findFirst({
          where: {
            alias,
          }
        })

        // An alias has been found in the database, use it in priority
        if (reference) {
          if (reference.type === 'costume') {
            const [firstResult] = costumesSearch.search(reference.item_id)
            const costume: ApiCostume = firstResult.item
            const embed = getCostumeEmbed(costume)

            console.log(`${message.author.username}#${message.author.discriminator} used "${alias}" and reference "${reference.alias}" to reference ${costume.character.name} - ${costume.title}`)

            message.channel.send({ embeds: [embed] })
          }

          if (reference.type === 'weapon') {
            const embed = new MessageEmbed()
              .setTitle('Sorry, weapons are not supported yet.')

              message.reply({
              embeds: [embed]
            })
          }

          continue
        }

        // If no alias has been found, try finding it with fuzzy search
        const [costumeResult] = costumesSearch.search(alias)

        if (!costumeResult) {
          console.warn(`${message.author.username}#${message.author.discriminator} used "${alias}" but yield no result.`)
          message.reply(`I am so sorry, Mama couldn't find anything useful from \`${alias}\`.\nTry searching the costume's title like \`[[Reborn Contractor]]\` or \`[[Sickly Exile]]\``)

          continue
        }

        const costume: ApiCostume = costumeResult.item
        const embed = getCostumeEmbed(costume)


        console.log(`${message.author.username}#${message.author.discriminator} used "${alias}" to reference ${costume.character.name} - ${costume.title}`)

        message.channel.send({ embeds: [embed] })
        // const [weaponResult] = weaponsSearch.search(alias)

        /* if (costumeResult) {
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
        } */

        continue
      }
    }
  } catch (error) {
    console.error(error)
  } finally {
    prisma.$disconnect();
  }
})

async function getDataset() {
  console.log('Fetching dataset')
  const prisma = new PrismaClient()

  const { data }: {
    data: ApiCostume[]
  } = await api.get('/costumes')

  costumesSearch = new Fuse(data, {
    keys: ['title', 'character.name', 'costume_id']
  })

  /*
  weaponsSearch = new Fuse(weapons, {
    keys: ['name.en']
  }) */

  console.log('Dataset is ready')
  prisma.$disconnect();
  client.login(process.env.DISCORD_BOT_TOKEN)
}

/* function getWeaponEmbed(data) {
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
} */

function getCostumeEmbed(costume: ApiCostume) {
  const url = `https://nierrein.guide/characters/${urlSlug(costume.character.name)}/${urlSlug(costume.title)}`

  let description = ``

  description += `Stats: ${emojis.hp} ${costume.costume_stat[0].hp} • ${emojis.atk} ${costume.costume_stat[0].atk} • ${emojis.def} ${costume.costume_stat[0].vit} • ${emojis.agility} ${costume.costume_stat[0].agi}`

  description += `\nAbilities: ${costume.costume_ability_link.map(ability => `**${ability.costume_ability.name}**`).join(' • ')}`

  description += `\nSkill: __${costume.costume_skill_link[0].costume_skill.name}__ (Gauge ${costume.costume_skill_link[0].costume_skill.gauge_rise_speed})`

  // ★

  const embed = new MessageEmbed()
    .setAuthor(`${costume.character.name} - ${costume.title} (${new Array(RARITY[costume.rarity]).fill('★').join('')})`, WEAPON_TYPE[costume.weapon_type], url)
    .setURL(url)
    .setDescription(description.trim())
    .setThumbnail(`${CDN_URL}${costume.image_path_base}battle.png`)
    .setFooter(`See more on nierrein.guide`, costume.is_ex_costume ? 'https://nierrein.guide/icons/weapons/dark.png' : '')

  return embed
}