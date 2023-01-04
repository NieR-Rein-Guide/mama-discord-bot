import { SlashCommandBuilder } from '@discordjs/builders'
import { ActionRowBuilder, AutocompleteInteraction, ChatInputCommandInteraction, Colors, ComponentType, Embed, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js'
import getCostumeEmbed from '../utils/getCostumeEmbed'
import { ApiCostume, ApiTierlistItem, ApiWeapon, BaseDiscordCommand, BotIndexes, debris } from '../..'
import { emojis, FEATURED_TIERLISTS, RARITY, WEAPON_TYPE_WORDS } from '../config'
import api from '../libs/api'
import getWeaponEmbed from '../utils/getWeaponEmbed'
import urlSlug from 'slugg'

export default class Costume implements BaseDiscordCommand {
  data = new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare 2 costumes/weapons.')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('What do you want to compare?')
        .setRequired(true)
        .addChoices(
          { name: 'Costumes', value: 'costumes' },
          { name: 'Weapons', value: 'weapons' },
        ))
    .addStringOption(option =>
      option.setName('first-item')
        .setDescription('First item')
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(option =>
      option.setName('second-item')
        .setDescription('Second item')
        .setRequired(true)
        .setAutocomplete(true))

  costumes: ApiCostume[] = []
  weapons: ApiWeapon[] = []
  costumesIndex: BotIndexes['costumesSearch']
  weaponsIndex: BotIndexes['weaponsSearch']

  constructor(costumes: ApiCostume[], weapons: ApiWeapon[], costumesIndex: BotIndexes['costumesSearch'], weaponsIndex: BotIndexes['weaponsSearch']) {
    this.costumes = costumes;
    this.weapons = weapons;
    this.costumesIndex = costumesIndex;
    this.weaponsIndex = weaponsIndex
  }

  async autocomplete (interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused();
    const selectedType = interaction.options.getString('type')

    if (selectedType === 'costumes') {
      const choices = this.costumesIndex.search(focusedValue)
        .map(item => item.item)
        .map(choice => ({
          name: `${choice.is_ex_costume ? 'EX ' : ''}${choice.character.name} - ${choice.title} (${new Array(RARITY[choice.rarity]).fill('★').join('')})`,
          value: `${choice.costume_id}`
        }))
        .slice(0, 10)

      await interaction.respond(choices).catch(() => {});
    } else {
      const choices = this.weaponsIndex.search(focusedValue)
      .map(item => item.item)
      .map(choice => ({
        name: `[${WEAPON_TYPE_WORDS[choice.weapon_type]}] -${choice.is_ex_weapon ? 'EX' : ''} ${choice.name} (${new Array(RARITY[choice.rarity]).fill('★').join('')})`,
        value: `${choice.weapon_id}`
      }))
      .slice(0, 10)

      interaction.respond(choices).catch(() => {})
    }
  }

  getItem(value, type: string) {
    if (type === 'costumes') {
      let costume = this.costumes.find((costume) => `${costume.costume_id}` === value)

      if (!costume) {
        const [firstResult] = this.costumesIndex.search(value)

        if (!firstResult) {
          return null
        }

        costume = firstResult.item as ApiCostume
      }

      return costume
    }


    let weapon = this.weapons.find((weapon) => `${weapon.weapon_id}` === value)

    if (!weapon) {
      const [firstResult] = this.weaponsIndex.search(value)

      if (!firstResult) {
        return null
      }

      weapon = firstResult.item as ApiWeapon
    }

    return
  }

  getDifferenceEmoji(value: number) {
    if (value === 0) {
      return emojis.equal
    }

    if (value < 0) {
      return emojis.negative
    }

    return emojis.positive
  }

  getSkillDifferenceEmoji(value: number) {
    if (value === 0) {
      return emojis.equal
    }

    if (value < 0) {
      return ':race_car:'
    }

    return ':snail:'
  }

  async getItemDescriptionCostume(firstCostume: ApiCostume, secondCostume: ApiCostume) {
    const differences = {
      hp: firstCostume.costume_stat[0].hp -  secondCostume.costume_stat[0].hp,
      atk: firstCostume.costume_stat[0].atk -  secondCostume.costume_stat[0].atk,
      vit: firstCostume.costume_stat[0].vit -  secondCostume.costume_stat[0].vit,
      agi: firstCostume.costume_stat[0].agi -  secondCostume.costume_stat[0].agi,
      cooldown: firstCostume.costume_skill_link[0].costume_skill.cooldown_time - secondCostume.costume_skill_link[0].costume_skill.cooldown_time
    }

    let description = ``

    /** STATS */
    description += `
      ${emojis.hp} \`${firstCostume.costume_stat[0].hp.toString().padEnd(7)}            ${secondCostume.costume_stat[0].hp}\` ${emojis.hp.toString().padStart(7)} ${this.getDifferenceEmoji(differences.hp)} ${differences.hp}
      ${emojis.atk} \`${firstCostume.costume_stat[0].atk.toString().padEnd(6)}            ${secondCostume.costume_stat[0].atk.toString().padStart(6)}\` ${emojis.atk} ${this.getDifferenceEmoji(differences.atk)} ${differences.atk}
      ${emojis.def} \`${firstCostume.costume_stat[0].vit.toString().padEnd(6)}            ${secondCostume.costume_stat[0].vit.toString().padStart(6)}\` ${emojis.def} ${this.getDifferenceEmoji(differences.vit)} ${differences.vit}
      ${emojis.agility} \`${firstCostume.costume_stat[0].agi.toString().padEnd(6)}            ${secondCostume.costume_stat[0].agi.toString().padStart(6)}\` ${emojis.agility} ${this.getDifferenceEmoji(differences.agi)} ${differences.agi}
    `.trim()

    /** SKILLS */
    description += `\n${emojis.skill} \`Gauge ${firstCostume.costume_skill_link[0].costume_skill.gauge_rise_speed}          ${secondCostume.costume_skill_link[0].costume_skill.gauge_rise_speed} Gauge\` ${emojis.skill}`
    description += `\n${emojis.skill} \`Value ${firstCostume.costume_skill_link[0].costume_skill.cooldown_time}    ${secondCostume.costume_skill_link[0].costume_skill.cooldown_time} Value\` ${emojis.skill} ${this.getSkillDifferenceEmoji(differences.cooldown)} ${differences.cooldown}`

    return description
  }

  async run (interaction: ChatInputCommandInteraction): Promise<void> {
    const selectedType = interaction.options.getString('type')
    const firstItem = this.getItem(interaction.options.getString('first-item'), selectedType)
    const secondItem = this.getItem(interaction.options.getString('second-item'), selectedType)

    if (!firstItem || !secondItem) {
      const embed = new EmbedBuilder()
        .setDescription('You need to fill both item fields sweetie!')
        .setColor(Colors.Red)

      interaction.reply({
        embeds: [embed],
        ephemeral: true,
      })

      return
    }

    if (selectedType === 'costumes') {
      const firstCharacterSlug = urlSlug(firstItem.character.name)
      const secondCharacterSlug = urlSlug(secondItem.character.name)

      const [
        firstCostumeWeaponData, secondCostumeWeaponData, firstCostumeDebrisData, secondCostumeDebrisData
      ] = await Promise.all([
        api.get(`/costume/weapon/${firstItem.costume_id}`),
        api.get(`/costume/weapon/${secondItem.costume_id}`),
        api.get(`/costume/debris/${firstItem.costume_id}`),
        api.get(`/costume/debris/${secondItem.costume_id}`),
      ])

      const firstItemWeapon: ApiWeapon = firstCostumeWeaponData?.data
      const secondItemWeapon: ApiWeapon = secondCostumeWeaponData?.data
      const firstItemDebris: debris = firstCostumeDebrisData?.data
      const secondItemDebris: debris = secondCostumeDebrisData?.data

      const description = await this.getItemDescriptionCostume(firstItem, secondItem)

      const firstAwakeningAbility = firstItem.costume_ability_link[2]
      const secondAwakeningAbility = secondItem.costume_ability_link[2]

      const embed = new EmbedBuilder()
        .setTitle(`
          ${emojis[firstCharacterSlug]} ${firstItem.title} - ${secondItem.title} ${emojis[secondCharacterSlug]}
        `.trim())
        .setDescription(description)
        .setColor(Colors.Blurple)
        .addFields([
          // First item ability
          {
            name: `${emojis[firstCharacterSlug]} Abilities`,
            value: `\n${[...firstItem.costume_ability_link].splice(0, 2).map((ability) =>
              `${emojis.ability} [**${ability.costume_ability.name}**](https://nierrein.guide/ability/costume/${urlSlug(ability.costume_ability.name)}-${ability.costume_ability.ability_id})\n${ability.costume_ability.description}`).join('\n')}`,
              inline: true,
          },
          // Second item ability
          {
            name: `Abilities ${emojis[secondCharacterSlug]}`,
            value: `\n${[...secondItem.costume_ability_link].splice(0, 2).map((ability) =>
              `${emojis.ability} [**${ability.costume_ability.name}**](https://nierrein.guide/ability/costume/${urlSlug(ability.costume_ability.name)}-${ability.costume_ability.ability_id})\n${ability.costume_ability.description}`).join('\n')}`,
              inline: true,
          },
          {
            name: `Awakening abilities`,
            value: '-',
          },
          {
            name: `${emojis[firstCharacterSlug]} ${emojis.awakening3} Awakening ability`,
            value: `${`[**${firstAwakeningAbility.costume_ability.name}**](${urlSlug(firstAwakeningAbility.costume_ability.name)}-${firstAwakeningAbility.costume_ability.ability_id})`}\n${firstAwakeningAbility.costume_ability.description}`,
            inline: true,
          },
          {
            name: `Awakening ability ${emojis.awakening3} ${emojis[secondCharacterSlug]}`,
            value: `${`[**${secondAwakeningAbility.costume_ability.name}**](${urlSlug(secondAwakeningAbility.costume_ability.name)}-${secondAwakeningAbility.costume_ability.ability_id})`}\n${secondAwakeningAbility.costume_ability.description}`,
            inline: true
          },
          {
            name: `Debris`,
            value: '-',
          },
          {
            name: `${emojis[firstCharacterSlug]} ${emojis.awakening5} Debris`,
            value: `**${firstItemDebris.name.replace('Debris: ', '')}**\n${firstItemDebris.description_long}`,
            inline: true,
          },
          {
            name: `Debris ${emojis.awakening5} ${emojis[secondCharacterSlug]}`,
            value: `**${secondItemDebris.name.replace('Debris: ', '')}**\n${secondItemDebris.description_long}`,
            inline: true,
          },
          {
            name: `Weapons`,
            value: '-',
          },
          {
            name: `${emojis[firstCharacterSlug]} Weapon`,
            value: `${emojis[firstItem.weapon_type]}${emojis[firstItemWeapon.attribute]} [${firstItemWeapon.name}](https://nierrein.guide/weapons/${firstItemWeapon.slug})`,
            inline: true,
          },
          {
            name: `Weapon ${emojis[secondCharacterSlug]}`,
            value: `${emojis[secondItem.weapon_type]}${emojis[secondItemWeapon.attribute]} [${secondItemWeapon.name}](https://nierrein.guide/weapons/${secondItemWeapon.slug})`,
            inline: true,
          },
        ])


      interaction.reply({
        embeds: [embed]
      })
      return
    }

  }
}
