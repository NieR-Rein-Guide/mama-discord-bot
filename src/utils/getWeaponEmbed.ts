import { CDN_URL, emojis, RARITY, WEAPON_TYPE } from "../config"
import { EmbedBuilder } from "discord.js"
import { ApiCostume, ApiWeapon } from "../.."
import urlSlug from 'slugg'

export default function getWeaponEmbed(weapon: ApiWeapon, costume?: ApiCostume) {
  const embed = new EmbedBuilder()
  const url = `https://nierrein.guide/weapons/${weapon.slug}`

  let stats = weapon.weapon_stat
    .filter((row) => !row.is_refined)
    .pop();

  const hasRefined = weapon.weapon_stat.find(
    (row) => row.is_refined
  );

  if (hasRefined) {
    stats = hasRefined;
  }

  let description = ``

  description += `${emojis.hp} ${stats.hp} • ${emojis.atk} ${stats.atk} • ${emojis.def} ${stats.vit}`

  description += `\n${weapon.weapon_skill_link.map(skill => `${emojis.skill} __${skill.weapon_skill.name}__ (${skill.weapon_skill.cooldown_time / 30} sec)`).join('\n')}`

  description += `\n${emojis.ability} Abilities: ${weapon.weapon_ability_link.map(ability => `[**${ability.weapon_ability.name}**](https://nierrein.guide/ability/weapon/${urlSlug(ability.weapon_ability.name)}-${ability.weapon_ability.ability_id})`).join(' • ')}`

  if (costume) {
    embed.setAuthor({
      name: `${costume.character.name} - ${costume.title}'s weapon`,
      iconURL: `${CDN_URL}${costume.character.image_path}`,
      url: `https://nierrein.guide/characters/${urlSlug(costume.character.name)}/${costume.slug}`
    })
  }

  embed
    .setTitle(`${emojis[weapon.weapon_type]} ${emojis[weapon.attribute]} ${weapon.name} (${new Array(RARITY[weapon.rarity]).fill('★').join('')})`)
    .setURL(url)
    .setDescription(description.trim())
    .setThumbnail(`${CDN_URL}${weapon.image_path}standard.png`)
    .setFooter({
      text: `Level: ${stats.level} • Weapon released`,
      iconURL: weapon.is_ex_weapon ? 'https://nierrein.guide/icons/weapons/dark.png' : WEAPON_TYPE[weapon.weapon_type]
    })
    .setTimestamp(new Date(weapon.release_time))

  return embed
}
