import { CDN_URL, emojis, RARITY, WEAPON_TYPE } from "../config"
import { EmbedBuilder } from "discord.js"
import { ApiCostume } from "../.."
import urlSlug from 'slugg'

export function getCostumeEmbed(costume: ApiCostume) {
  const url = `https://nierrein.guide/characters/${urlSlug(costume.character.name)}/${urlSlug(costume.title)}`

  let description = ``

  description += `Stats: ${emojis.hp} ${costume.costume_stat[0].hp} • ${emojis.atk} ${costume.costume_stat[0].atk} • ${emojis.def} ${costume.costume_stat[0].vit} • ${emojis.agility} ${costume.costume_stat[0].agi}`

  description += `\nSkill: __${costume.costume_skill_link[0].costume_skill.name}__ (Gauge ${costume.costume_skill_link[0].costume_skill.gauge_rise_speed})`

  description += `\nAbilities: ${[...costume.costume_ability_link].splice(0, 2).map(ability => `[**${ability.costume_ability.name}**](https://nierrein.guide/ability/costume/${urlSlug(ability.costume_ability.name)}-${ability.costume_ability.ability_id})`).join(' • ')}`

  if (costume.costume_ability_link[2]) {
    const awakeningAbility = costume.costume_ability_link[2]
    description += `\nAwakening Ability: ${`[**${awakeningAbility.costume_ability.name}**](${urlSlug(awakeningAbility.costume_ability.name)}-${awakeningAbility.costume_ability.ability_id})`}`
  }

  const embed = new EmbedBuilder()
    .setTitle(`${emojis[costume.weapon_type]} ${costume.character.name} - ${costume.title} (${new Array(RARITY[costume.rarity]).fill('★').join('')})`)
    .setURL(url)
    .setDescription(description.trim())
    .setThumbnail(`${CDN_URL}${costume.image_path_base}battle.png`)
    .setFooter({
       text: `Level: ${costume.costume_stat[0].level} • Costume released`,
       iconURL: costume.is_ex_costume ? 'https://nierrein.guide/icons/weapons/dark.png' : WEAPON_TYPE[costume.weapon_type]
    })
    .setTimestamp(new Date(costume.release_time))

  return embed
}