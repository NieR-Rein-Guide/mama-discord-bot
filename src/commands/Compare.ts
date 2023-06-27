import { SlashCommandBuilder } from '@discordjs/builders'
import { ActionRowBuilder, AutocompleteInteraction, ChatInputCommandInteraction, Colors, ComponentType, Embed, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js'
import getCostumeEmbed from '../utils/getCostumeEmbed'
import { ApiCostume, ApiTierlistItem, ApiWeapon, BaseDiscordCommand, BotIndexes, debris } from '../..'
import { emojis, FEATURED_TIERLISTS, RARITY, WEAPON_TYPE_WORDS } from '../config'
import api from '../libs/api'
import getWeaponEmbed from '../utils/getWeaponEmbed'
import urlSlug from 'slugg'
import getCostumeLevelsByRarity from '../utils/getCostumeLevelsByRarity'

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

  getItem(value, type: 'weapons' | 'costumes') {
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

    return weapon
  }

  getGaugeDifferenceSymbol(first, second) {
    if (first === second) return emojis.equal
    if (first > second) return emojis.positive
    return emojis.negative
  }

  getDifferenceSymbol(value: number) {
    if (value === 0) {
      return '='
    }

    if (value < 0) {
      return '<'
    }

    return '>'
  }

  getSkillDifferenceSymbol(value: number) {
    if (value === 0) {
      return '='
    }

    if (value < 0) {
      return '<'
    }

    return '>'
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

  getItemDescriptionCostume(firstCostume: ApiCostume, secondCostume: ApiCostume, {
    awakeningStep = 0,
  }) {

    const { maxWithAsc: firstMax } = getCostumeLevelsByRarity(firstCostume.rarity);
    const firstLevel = firstMax + 10;
    const firstStats = firstCostume.costume_stat
      .filter((stat) => stat.level === firstLevel)
      .sort((a, b) => a.awakening_step - b.awakening_step)
      .filter((row) => row.awakening_step === awakeningStep)
      .pop()

    const { maxWithAsc: secondMax } = getCostumeLevelsByRarity(secondCostume.rarity);
    const secondLevel = secondMax + 10;
    const secondStats = secondCostume.costume_stat
      .filter((stat) => stat.level === secondLevel)
      .sort((a, b) => a.awakening_step - b.awakening_step)
      .filter((row) => row.awakening_step === awakeningStep)
      .pop()

    const differences = {
      hp: firstStats.hp -  secondStats.hp,
      atk: firstStats.atk -  secondStats.atk,
      vit: firstStats.vit -  secondStats.vit,
      agi: firstStats.agi -  secondStats.agi,
      cooldown: firstCostume.costume_skill_link[0].costume_skill.cooldown_time - secondCostume.costume_skill_link[0].costume_skill.cooldown_time
    }

    const secondDifferences = {
      hp: secondStats.hp -  firstStats.hp,
      atk: secondStats.atk -  firstStats.atk,
      vit: secondStats.vit -  firstStats.vit,
      agi: secondStats.agi -  firstStats.agi,
      cooldown: secondCostume.costume_skill_link[0].costume_skill.cooldown_time - firstCostume.costume_skill_link[0].costume_skill.cooldown_time
    }

    let description = ``

    /** STATS */
    description += `
      ${this.getDifferenceEmoji(differences.hp)} \`${differences.hp.toString().padEnd(6)}\` ${emojis.hp} \`${firstStats.hp.toString().padEnd(7)}     ${this.getDifferenceSymbol(differences.hp)}       ${secondStats.hp}\` ${emojis.hp} \`${secondDifferences.hp.toString().padStart(6)}\` ${this.getDifferenceEmoji(secondDifferences.hp)}
      ${this.getDifferenceEmoji(differences.atk)} \`${differences.atk.toString().padEnd(6)}\` ${emojis.atk} \`${firstStats.atk.toString().padEnd(6)}      ${this.getDifferenceSymbol(differences.atk)}      ${secondStats.atk.toString().padStart(6)}\` ${emojis.atk} \`${secondDifferences.atk.toString().padStart(6)}\` ${this.getDifferenceEmoji(secondDifferences.atk)}
      ${this.getDifferenceEmoji(differences.vit)} \`${differences.vit.toString().padEnd(6)}\` ${emojis.def} \`${firstStats.vit.toString().padEnd(6)}      ${this.getDifferenceSymbol(differences.vit)}      ${secondStats.vit.toString().padStart(6)}\` ${emojis.def} \`${secondDifferences.vit.toString().padStart(6)}\` ${this.getDifferenceEmoji(secondDifferences.vit)}
      ${this.getDifferenceEmoji(differences.agi)} \`${differences.agi.toString().padEnd(6)}\` ${emojis.agility} \`${firstStats.agi.toString().padEnd(6)}      ${this.getDifferenceSymbol(differences.agi)}      ${secondStats.agi.toString().padStart(6)}\` ${emojis.agility} \`${secondDifferences.agi.toString().padStart(6)}\` ${this.getDifferenceEmoji(secondDifferences.agi)}
    `.trim()

    /** SKILLS */
    description += `\n${this.getGaugeDifferenceSymbol(firstCostume.costume_skill_link[0].costume_skill.gauge_rise_speed, secondCostume.costume_skill_link[0].costume_skill.gauge_rise_speed)} \`${''.padEnd(6)}\` ${emojis.skill} \`Gauge ${firstCostume.costume_skill_link[0].costume_skill.gauge_rise_speed}           ${secondCostume.costume_skill_link[0].costume_skill.gauge_rise_speed} Gauge\` ${emojis.skill} \`${''.padEnd(6)}\` ${this.getGaugeDifferenceSymbol(firstCostume.costume_skill_link[0].costume_skill.gauge_rise_speed, secondCostume.costume_skill_link[0].costume_skill.gauge_rise_speed)}`
    description += `\n${this.getSkillDifferenceEmoji(differences.cooldown)} \`${differences.cooldown.toString().padEnd(6)}\` ${emojis.skill} \`Value ${firstCostume.costume_skill_link[0].costume_skill.cooldown_time}  ${this.getSkillDifferenceSymbol(differences.cooldown)}  ${secondCostume.costume_skill_link[0].costume_skill.cooldown_time} Value\` ${emojis.skill} \`${secondDifferences.cooldown.toString().padStart(6)}\` ${this.getSkillDifferenceEmoji(secondDifferences.cooldown)}`

    return description
  }

  getItemDescriptionWeapon(firstWeapon: ApiWeapon, secondWeapon: ApiWeapon) {
    let firstStats = firstWeapon.weapon_stat
      .filter((row) => !row.is_refined)
      .pop();
    let secondStats = secondWeapon.weapon_stat
      .filter((row) => !row.is_refined)
      .pop();

    const hasRefinedFirst = firstWeapon.weapon_stat.find(
      (row) => row.is_refined
    );
    const hasRefinedSecond = secondWeapon.weapon_stat.find(
      (row) => row.is_refined
    );

    if (hasRefinedFirst && hasRefinedSecond) {
      firstStats = hasRefinedFirst;
      secondStats = hasRefinedSecond;
    }

    const differences = {
      hp: firstStats.hp -  secondStats.hp,
      atk: firstStats.atk -  secondStats.atk,
      vit: firstStats.vit -  secondStats.vit,
      cooldown1: firstWeapon.weapon_skill_link[0].weapon_skill.cooldown_time / 30 - secondWeapon.weapon_skill_link[0].weapon_skill.cooldown_time / 30,
      cooldown2: firstWeapon.weapon_skill_link[1].weapon_skill.cooldown_time / 30 - secondWeapon.weapon_skill_link[1].weapon_skill.cooldown_time / 30
    }

    const secondDifferences = {
      hp: secondStats.hp -  firstStats.hp,
      atk: secondStats.atk -  firstStats.atk,
      vit: secondStats.vit -  firstStats.vit,
      cooldown1: secondWeapon.weapon_skill_link[0].weapon_skill.cooldown_time / 30 - firstWeapon.weapon_skill_link[0].weapon_skill.cooldown_time / 30,
      cooldown2: secondWeapon.weapon_skill_link[1].weapon_skill.cooldown_time / 30 - firstWeapon.weapon_skill_link[1].weapon_skill.cooldown_time / 30
    }

    let description = ``

    /** STATS */
    description += `
      ${this.getDifferenceEmoji(differences.hp)} \`${differences.hp.toString().padEnd(6)}\` ${emojis.hp} \`${firstStats.hp.toString().padEnd(7)}     ${this.getDifferenceSymbol(differences.hp)}       ${secondStats.hp}\` ${emojis.hp} \`${secondDifferences.hp.toString().padStart(6)}\` ${this.getDifferenceEmoji(secondDifferences.hp)}
      ${this.getDifferenceEmoji(differences.atk)} \`${differences.atk.toString().padEnd(6)}\` ${emojis.atk} \`${firstStats.atk.toString().padEnd(6)}      ${this.getDifferenceSymbol(differences.atk)}      ${secondStats.atk.toString().padStart(6)}\` ${emojis.atk} \`${secondDifferences.atk.toString().padStart(6)}\` ${this.getDifferenceEmoji(secondDifferences.atk)}
      ${this.getDifferenceEmoji(differences.vit)} \`${differences.vit.toString().padEnd(6)}\` ${emojis.def} \`${firstStats.vit.toString().padEnd(6)}      ${this.getDifferenceSymbol(differences.vit)}      ${secondStats.vit.toString().padStart(6)}\` ${emojis.def} \`${secondDifferences.vit.toString().padStart(6)}\` ${this.getDifferenceEmoji(secondDifferences.vit)}
    `.trim()

    /** SKILLS */
    description += `\n${this.getSkillDifferenceEmoji(differences.cooldown1)} \`${`${differences.cooldown1}sec`.padEnd(6)}\` ${emojis.skill} \`CD ${firstWeapon.weapon_skill_link[0].weapon_skill.cooldown_time / 30}sec    ${this.getSkillDifferenceSymbol(differences.cooldown1)}    ${secondWeapon.weapon_skill_link[0].weapon_skill.cooldown_time / 30}sec CD\` ${emojis.skill} \`${`${secondDifferences.cooldown1}sec`.padStart(6)}\` ${this.getSkillDifferenceEmoji(secondDifferences.cooldown1)}`

    description += `\n${this.getSkillDifferenceEmoji(differences.cooldown2)} \`${`${differences.cooldown2}sec`.padEnd(6)}\` ${emojis.skill} \`CD ${firstWeapon.weapon_skill_link[1].weapon_skill.cooldown_time / 30}sec    ${this.getSkillDifferenceSymbol(differences.cooldown2)}    ${secondWeapon.weapon_skill_link[1].weapon_skill.cooldown_time / 30}sec CD\` ${emojis.skill} \`${`${secondDifferences.cooldown2}sec`.padStart(6)}\` ${this.getSkillDifferenceEmoji(secondDifferences.cooldown2)}`

    return description
  }

  async run (interaction: ChatInputCommandInteraction): Promise<void> {
    const selectedType = interaction.options.getString('type') as 'weapons' | 'costumes'
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
      // @ts-expect-error aa
      const firstCostume: ApiCostume = firstItem as unknown
      // @ts-expect-error aa
      const secondCostume: ApiCostume  = secondItem as unknown

      console.log(`${interaction.user.username}#${interaction.user.discriminator} updated existing embed "/compare <${selectedType}> <${firstCostume.character.name} - ${firstCostume.title}> <${secondCostume.character.name} - ${secondCostume.title}>" [in Guild:${interaction.guild?.name}]`)

      const firstCharacterSlug = urlSlug(firstCostume.character.name)
      const secondCharacterSlug = urlSlug(secondCostume.character.name)

      const [
        firstCostumeWeaponData, secondCostumeWeaponData, firstCostumeDebrisData, secondCostumeDebrisData
      ] = await Promise.all([
        api.get(`/costume/weapon/${firstCostume.costume_id}`),
        api.get(`/costume/weapon/${secondCostume.costume_id}`),
        api.get(`/costume/debris/${firstCostume.costume_id}`),
        api.get(`/costume/debris/${secondCostume.costume_id}`),
      ])

      const firstItemWeapon: ApiWeapon = firstCostumeWeaponData?.data
      const secondItemWeapon: ApiWeapon = secondCostumeWeaponData?.data
      const firstItemDebris: debris = firstCostumeDebrisData?.data
      const secondItemDebris: debris = secondCostumeDebrisData?.data

      const description = this.getItemDescriptionCostume(firstCostume, secondCostume, {
        awakeningStep: 0,
      })

      const firstAwakeningAbility = firstCostume.costume_ability_link[2]
      const secondAwakeningAbility = secondCostume.costume_ability_link[2]

      const embed = new EmbedBuilder()
        .setTitle(`
          ${emojis[firstCharacterSlug]} ${firstCostume.title} - ${secondCostume.title} ${emojis[secondCharacterSlug]}
        `.trim())
        .setDescription(description)
        .setColor(Colors.Blurple)
        .addFields([
          // First item Skill
          {
            name: `${emojis[firstCharacterSlug]} Character Skill`,
            value: `${emojis.skill} **${firstCostume.costume_skill_link[0].costume_skill.name}**\n${firstCostume.costume_skill_link[0].costume_skill.description}`,
            inline: true,
          },
          // Second item Skill
          {
            name: `Character Skill ${emojis[secondCharacterSlug]}`,
            value: `${emojis.skill} **${secondCostume.costume_skill_link[0].costume_skill.name}**\n${secondCostume.costume_skill_link[0].costume_skill.description}`,
            inline: true,
          },
          {
            name: `Abilities`,
            value: '-',
          },
          // First item ability
          {
            name: `${emojis[firstCharacterSlug]} Abilities`,
            value: `\n${[...firstCostume.costume_ability_link].splice(0, 2).map((ability) =>
              `${emojis.ability} [**${ability.costume_ability.name}**](https://nierrein.guide/ability/costume/${urlSlug(ability.costume_ability.name)}-${ability.costume_ability.ability_id})\n${ability.costume_ability.description}`).join('\n')}`,
            inline: true,
          },
          // Second item ability
          {
            name: `Abilities ${emojis[secondCharacterSlug]}`,
            value: `\n${[...secondCostume.costume_ability_link].splice(0, 2).map((ability) =>
              `${emojis.ability} [**${ability.costume_ability.name}**](https://nierrein.guide/ability/costume/${urlSlug(ability.costume_ability.name)}-${ability.costume_ability.ability_id})\n${ability.costume_ability.description}`).join('\n')}`,
            inline: true,
          },
          {
            name: `Awakening abilities`,
            value: '-',
          },
          {
            name: `${emojis[firstCharacterSlug]} ${emojis.awakening3} Awakening ability`,
            value: `${`**${firstAwakeningAbility.costume_ability.name}**`}\n${firstAwakeningAbility.costume_ability.description}`,
            inline: true,
          },
          {
            name: `Awakening ability ${emojis.awakening3} ${emojis[secondCharacterSlug]}`,
            value: `${`**${secondAwakeningAbility.costume_ability.name}**`}\n${secondAwakeningAbility.costume_ability.description}`,
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
            value: `${emojis[firstCostume.weapon_type]}${emojis[firstItemWeapon.attribute]} [${firstItemWeapon.name}](https://nierrein.guide/weapons/${firstItemWeapon.slug})`,
            inline: true,
          },
          {
            name: `Weapon ${emojis[secondCharacterSlug]}`,
            value: `${emojis[secondCostume.weapon_type]}${emojis[secondItemWeapon.attribute]} [${secondItemWeapon.name}](https://nierrein.guide/weapons/${secondItemWeapon.slug})`,
            inline: true,
          },
        ])


      interaction.reply({
        embeds: [embed]
      })
      return
    }

    // @ts-expect-error aa
    const firstWeapon: ApiWeapon = firstItem as unknown
    // @ts-expect-error aa
    const secondWeapon: ApiWeapon  = secondItem as unknown

    console.log(`${interaction.user.username}#${interaction.user.discriminator} updated existing embed "/compare <${selectedType}> <${firstWeapon.name}> <${secondWeapon.name}>" [in Guild:${interaction.guild?.name}]`)

    const description = this.getItemDescriptionWeapon(firstWeapon, secondWeapon)

    const [firstWeaponCostumeData, secondWeaponCostumeData] = await Promise.all([
      api.get(`/weapon/costume/${firstWeapon.weapon_id}`).catch(() => ({ data: null })),
      api.get(`/weapon/costume/${secondWeapon.weapon_id}`).catch(() => ({ data: null })),
    ])
    const firstWeaponCostume: ApiCostume = firstWeaponCostumeData?.data
    const secondWeaponCostume: ApiCostume = secondWeaponCostumeData?.data

    const embed = new EmbedBuilder()
      .setTitle(`
        ${emojis[firstWeapon.weapon_type]}${emojis[firstWeapon.attribute]} ${firstWeapon.name} - ${secondWeapon.name} ${emojis[secondWeapon.attribute]}${emojis[secondWeapon.weapon_type]}
      `.trim())
      .setDescription(description)
      .setColor(Colors.Blurple)
      .addFields([
        // First item ability
        {
          name: `${emojis[firstWeapon.weapon_type]}${emojis[firstWeapon.attribute]} Abilities`,
          value: `\n${[...firstWeapon.weapon_ability_link].map((ability) =>
            `${emojis.ability} [**${ability.weapon_ability.name}**](https://nierrein.guide/ability/weapon/${urlSlug(ability.weapon_ability.name)}-${ability.weapon_ability.ability_id})\n${ability.weapon_ability.description}`).join('\n')}`,
            inline: true,
        },
        // Second item ability
        {
          name: `Abilities ${emojis[secondWeapon.weapon_type]}${emojis[secondWeapon.attribute]}`,
          value: `\n${[...secondWeapon.weapon_ability_link].map((ability) =>
            `${emojis.ability} [**${ability.weapon_ability.name}**](https://nierrein.guide/ability/weapon/${urlSlug(ability.weapon_ability.name)}-${ability.weapon_ability.ability_id})\n${ability.weapon_ability.description}`).join('\n')}`,
            inline: true,
        },
        firstWeaponCostume || secondWeaponCostume ? {
          name: `Costumes`,
          value: '-',
        } : null,
        firstWeaponCostume || secondWeaponCostume ? {
          name: `${emojis[firstWeapon.weapon_type]}${emojis[firstWeapon.attribute]} Costume`,
          value: firstWeaponCostume ? `${emojis[urlSlug(firstWeaponCostume.character.name)]} [${firstWeaponCostume.character.name} - ${firstWeaponCostume.title}](https://nierrein.guide/characters/${urlSlug(firstWeaponCostume.character.name)}/${firstWeaponCostume.slug})` : 'No costume.',
          inline: true,
        } : null,
        firstWeaponCostume || secondWeaponCostume ? {
          name: `Costume ${emojis[secondWeapon.attribute]}${emojis[secondWeapon.weapon_type]}`,
          value: secondWeaponCostume ? `${emojis[urlSlug(secondWeaponCostume.character.name)]} [${secondWeaponCostume.character.name} - ${secondWeaponCostume.title}](https://nierrein.guide/characters/${urlSlug(secondWeaponCostume.character.name)}/${secondWeaponCostume.slug})` : 'No costume.',
          inline: true,
        } : null,
      ].filter(Boolean))

    interaction.reply({
      embeds: [embed]
    })
  }
}
