import client from './libs/client'
import api from './libs/api'
import { emojis, formatRegex, RARITY, WEAPON_TYPE } from './config'
import { MessageEmbed } from 'discord.js';
import urlSlug from 'slugg'
import Fuse from 'fuse.js'
import { PrismaClient } from '@prisma/client'
import { Message } from 'discord.js';
import { ApiCostume, ApiWeapon } from '..';

const CDN_URL = "https://s3.eu-central-1.wasabisys.com/nierreincarnation/"

// Blacklist
const blacklist = new Map()
// Cleared every hour
setInterval(() => {
  blacklist.clear()
}, 3600000)

// Dataset
let costumesSearch = null
let weaponsSearch = null
let search = null
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
            const [firstResult] = weaponsSearch.search(reference.item_id)
            const weapon = firstResult.item as ApiWeapon
            const embed = getWeaponEmbed(weapon)

            console.log(`${message.author.username}#${message.author.discriminator} used "${alias}" and reference "${reference.alias}" to reference ${weapon.name}`)

            message.channel.send({ embeds: [embed] })
          }

          continue
        }

        // If no alias has been found, try finding it with fuzzy search
        const [firstResult] = search.search(alias)

        if (!firstResult) {
          console.warn(`${message.author.username}#${message.author.discriminator} used "${alias}" but yield no result.`)

          message.reply(`I am so sorry, Mama couldn't find anything useful from \`${alias}\`.\nTry searching the costume's title like \`[[Reborn Contractor]]\` or \`[[Sickly Exile]]\``)
          continue
        }

        // Score isn't satisfying, try searching separately
        // 0 is perfect match, 1 is not a match
        if (firstResult.score >= 0.007) {
          const [costumeResult] = costumesSearch.search(alias)

          // No viable costume was found
          // trying searching for a weapon instead
          if (!costumeResult || costumeResult.score >= 0.007) {
            const [weaponResult] = weaponsSearch.search(alias)

            // No weapon either? Welp no luck.
            if (!weaponResult) {
              console.warn(`${message.author.username}#${message.author.discriminator} used "${alias}" but yield no result.`)
              message.reply(`I am so sorry, Mama couldn't find anything useful from \`${alias}\`.\nTry searching the costume's title like \`[[Reborn Contractor]]\` or \`[[Sickly Exile]]\``)
              continue
            }

            const weapon = weaponResult.item as ApiWeapon
            const embed = getWeaponEmbed(weapon)

            console.log(`${message.author.username}#${message.author.discriminator} used "${alias}" and reference "${reference.alias}" to reference ${weapon.name}`)

            message.channel.send({ embeds: [embed] })

            continue
          }

          const costume: ApiCostume = costumeResult.item
          const embed = getCostumeEmbed(costume)


          console.log(`${message.author.username}#${message.author.discriminator} used "${alias}" to reference ${costume.character.name} - ${costume.title}`)

          message.channel.send({ embeds: [embed] })

          continue
        }

        // It's a costume
        if (firstResult.item.costume_id) {
          const costume = firstResult.item as ApiCostume
          const embed = getCostumeEmbed(costume)
          console.log(`${message.author.username}#${message.author.discriminator} used "${alias}" and reference "${reference.alias}" to reference ${costume.character.name} - ${costume.title}`)
          message.channel.send({ embeds: [embed] })
        }
        // It's a weapon
        else {
          const weapon = firstResult.item as ApiWeapon
          const embed = getWeaponEmbed(weapon)

          console.log(`${message.author.username}#${message.author.discriminator} used "${alias}" and reference "${reference.alias}" to reference ${weapon.name}`)

          message.channel.send({ embeds: [embed] })
        }

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

  const { data: costumes }: {
    data: ApiCostume[]
  } = await api.get('/costumes')

  const { data: weapons }: {
    data: ApiWeapon[]
  } = await api.get('/weapons')

  search = new Fuse([...costumes, ...weapons], {
    keys: ['name', 'title', 'character.name', 'costume_id', 'weapon_id'],
    includeScore: true,
  })

  costumesSearch = new Fuse(costumes, {
    keys: ['title', 'character.name', 'costume_id'],
    includeScore: true,
  })

  weaponsSearch = new Fuse(weapons, {
    keys: ['name', 'weapon_id'],
    includeScore: true,
  })

  console.log('Dataset is ready')
  prisma.$disconnect();
  client.login(process.env.DISCORD_BOT_TOKEN)
}

function getWeaponEmbed(weapon: ApiWeapon) {
  const url = `https://nierrein.guide/weapons/`

  let description = ``

  description += `Stats: ${emojis.hp} ${weapon.weapon_stat[0].hp} • ${emojis.atk} ${weapon.weapon_stat[0].atk} • ${emojis.def} ${weapon.weapon_stat[0].vit}`

  description += `\n${weapon.weapon_skill_link.map(skill => `__${skill.weapon_skill.name}__ (Gauge ${skill.weapon_skill.cooldown_time})`).join('\n')}`

  description += `\nAbilities: ${weapon.weapon_ability_link.map(ability => `**${ability.weapon_ability.name}**`).join(' • ')}`


  const embed = new MessageEmbed()
    .setTitle(`${emojis[weapon.weapon_type]} ${emojis[weapon.attribute]} ${weapon.name} (${new Array(RARITY[weapon.rarity]).fill('★').join('')})`)
    .setURL(url)
    .setDescription(description.trim())
    .setThumbnail(`${CDN_URL}${weapon.image_path}standard.png`)
    .setFooter(`Level: ${weapon.weapon_stat[0].level} • Weapon released`, weapon.is_ex_weapon ? 'https://nierrein.guide/icons/weapons/dark.png' : '')
    .setTimestamp(new Date(weapon.release_time))

  return embed
}

function getCostumeEmbed(costume: ApiCostume) {
  const url = `https://nierrein.guide/characters/${urlSlug(costume.character.name)}/${urlSlug(costume.title)}`

  let description = ``

  description += `Stats: ${emojis.hp} ${costume.costume_stat[0].hp} • ${emojis.atk} ${costume.costume_stat[0].atk} • ${emojis.def} ${costume.costume_stat[0].vit} • ${emojis.agility} ${costume.costume_stat[0].agi}`

  description += `\nSkill: __${costume.costume_skill_link[0].costume_skill.name}__ (Gauge ${costume.costume_skill_link[0].costume_skill.gauge_rise_speed})`

  description += `\nAbilities: ${costume.costume_ability_link.map(ability => `**${ability.costume_ability.name}**`).join(' • ')}`

  const embed = new MessageEmbed()
    .setTitle(`${emojis[costume.weapon_type]} ${costume.character.name} - ${costume.title} (${new Array(RARITY[costume.rarity]).fill('★').join('')})`)
    .setURL(url)
    .setDescription(description.trim())
    .setThumbnail(`${CDN_URL}${costume.image_path_base}battle.png`)
    .setFooter(`Level: ${costume.costume_stat[0].level} • Costume released`, costume.is_ex_costume ? 'https://nierrein.guide/icons/weapons/dark.png' : '')
    .setTimestamp(new Date(costume.release_time))

  return embed
}