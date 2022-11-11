import { CDN_URL, emojis, RARITY, WEAPON_TYPE } from "../config"
import { EmbedBuilder } from "discord.js"
import { ApiWeapon } from "../.."
import urlSlug from 'slugg'

export default function getWeaponEmbed(weapon: ApiWeapon) {
  const url = `https://nierrein.guide/weapons/${weapon.slug}`

  let description = ``

  description += `Stats: ${emojis.hp} ${weapon.weapon_stat[0].hp} • ${emojis.atk} ${weapon.weapon_stat[0].atk} • ${emojis.def} ${weapon.weapon_stat[0].vit}`

  description += `\n${weapon.weapon_skill_link.map(skill => `__${skill.weapon_skill.name}__ (${skill.weapon_skill.cooldown_time / 30} sec)`).join('\n')}`

  description += `\nAbilities: ${weapon.weapon_ability_link.map(ability => `[**${ability.weapon_ability.name}**](https://nierrein.guide/ability/weapon/${urlSlug(ability.weapon_ability.name)}-${ability.weapon_ability.ability_id})`).join(' • ')}`


  const embed = new EmbedBuilder()
    .setTitle(`${emojis[weapon.weapon_type]} ${emojis[weapon.attribute]} ${weapon.name} (${new Array(RARITY[weapon.rarity]).fill('★').join('')})`)
    .setURL(url)
    .setDescription(description.trim())
    .setThumbnail(`${CDN_URL}${weapon.image_path}standard.png`)
    .setFooter({
      text: `Level: ${weapon.weapon_stat[0].level} • Weapon released`,
      iconURL: weapon.is_ex_weapon ? 'https://nierrein.guide/icons/weapons/dark.png' : WEAPON_TYPE[weapon.weapon_type]
    })
    .setTimestamp(new Date(weapon.release_time))

  return embed
}