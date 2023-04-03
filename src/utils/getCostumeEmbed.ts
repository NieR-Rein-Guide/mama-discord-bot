import { CDN_URL, emojis, RARITY, WEAPON_TYPE } from "../config"
import { EmbedBuilder } from "discord.js"
import { ApiCostume, ApiWeapon, debris } from "../.."
import urlSlug from 'slugg'
import getCostumeLevelsByRarity from "./getCostumeLevelsByRarity"

export default function getCostumeEmbed(costume: ApiCostume, weapon?: ApiWeapon, debris?: debris, awakeningStep?: number, isExalted?: boolean) {
  const embed = new EmbedBuilder()

  const { maxWithAsc } = getCostumeLevelsByRarity(costume.rarity);
  const selectedLevel = isExalted ? maxWithAsc + 10 : maxWithAsc;
  const stats = costume.costume_stat
    .filter((stat) => stat.level === selectedLevel)
    .sort((a, b) => a.awakening_step - b.awakening_step)
    .filter((row) => row.awakening_step === awakeningStep)
    .pop()


  const url = `https://nierrein.guide/characters/${urlSlug(costume.character.name)}/${urlSlug(costume.title)}`
  const emojiCharacterSlug = urlSlug(costume.character.name)

  let description = ``

  description += `${emojis.hp} ${stats.hp} • ${emojis.atk} ${stats.atk} • ${emojis.def} ${stats.vit} • ${emojis.agility} ${stats.agi}`

  description += `\n${emojis.skill} Skill: __${costume.costume_skill_link[0].costume_skill.name}__ (Gauge ${costume.costume_skill_link[0].costume_skill.gauge_rise_speed})`

  description += `\n${emojis.ability} Abilities: ${[...costume.costume_ability_link].splice(0, 2).map(ability => `[**${ability.costume_ability.name}**](https://nierrein.guide/ability/costume/${urlSlug(ability.costume_ability.name)}-${ability.costume_ability.ability_id})`).join(' • ')}`

  if (weapon) {
    description += `\n${emojis[costume.weapon_type]}${emojis[weapon.attribute]} Weapon: [${weapon.name}](https://nierrein.guide/weapons/${weapon.slug})`
  }

  if (costume.costume_ability_link[2]) {
    const awakeningAbility = costume.costume_ability_link[2]
    description += `\n\n${emojis.awakening3} Awakening Ability: ${`[**${awakeningAbility.costume_ability.name}**](${urlSlug(awakeningAbility.costume_ability.name)}-${awakeningAbility.costume_ability.ability_id})`}\n${awakeningAbility.costume_ability.description}`
  }

  if (debris) {
    description += `\n\n${emojis.awakening5} Debris: **${debris.name.replace('Debris: ', '')}**\n${debris.description_long}`
  }

  embed
    .setTitle(`${isExalted ? emojis.refined : ''}${awakeningStep > 0 ? emojis[`awakening${awakeningStep}`] : ''}${emojis[emojiCharacterSlug]} ${costume.character.name} - ${costume.title} (${new Array(RARITY[costume.rarity]).fill('★').join('')})`)
    .setURL(url)
    .setThumbnail(`${CDN_URL}${costume.image_path_base}battle.png`)
    .setFooter({
       text: `Level: ${stats.level} • Costume released`,
       iconURL: costume.is_ex_costume ? 'https://nierrein.guide/icons/weapons/dark.png' : WEAPON_TYPE[costume.weapon_type]
    })
    .setTimestamp(new Date(costume.release_time))
    .setDescription(description.trim())

  return embed
}