import { SlashCommandBuilder } from '@discordjs/builders'
import { ActionRowBuilder, ApplicationCommandOptionChoiceData, AutocompleteInteraction, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Colors, ComponentType, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js'
import { ApiCostume, ApiWeapon, BaseDiscordCommand, costume_ability, weapon_ability } from '../..'
import { emojis } from '../config'
import urlSlug from 'slugg'

export default class Costume implements BaseDiscordCommand {
  data = new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search and filter costumes or weapons.')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('What do you want to search?')
        .setRequired(true)
        .addChoices(
          { name: 'Costumes', value: 'costumes' },
          { name: 'Weapons', value: 'weapons' },
        ))
    .addStringOption(option =>
      option.setName('first-ability')
        .setDescription('First ability, type to search')
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(option =>
      option.setName('second-ability')
        .setDescription('Second ability, type so search')
        .setRequired(false)
        .setAutocomplete(true))

  costumes: ApiCostume[] = []
  costumesAbilities: costume_ability[] = []
  weapons: ApiWeapon[] = []
  weaponsAbilities: weapon_ability[] = []

  constructor(
    costumes: ApiCostume[],
    weapons: ApiWeapon[],
    costumesAbilities: costume_ability[],
    weaponsAbilities: weapon_ability[],
  ) {
    this.costumes = costumes;
    this.weapons = weapons;
    this.costumesAbilities = costumesAbilities;
    this.weaponsAbilities = weaponsAbilities;
  }

  async autocomplete (interaction: AutocompleteInteraction): Promise<void> {
    const focused = interaction.options.getFocused(true);
    const focusedValue = focused.value;
    const selectedType = interaction.options.getString('type')

    if (selectedType === 'costumes') {
      const choices: ApplicationCommandOptionChoiceData<string | number>[] = this.costumesAbilities.filter((ability) =>
        ability.name.toLowerCase().includes(focusedValue.toLowerCase())
      ).map((ability) => ({
        name: ability.name,
        value: ability.name,
      })).slice(0, 10)

      return interaction.respond(choices).catch(() => {})
    }

    if (selectedType === 'weapons') {
      const choices: ApplicationCommandOptionChoiceData<string | number>[] = this.weaponsAbilities.filter((ability) =>
        ability.name.toLowerCase().includes(focusedValue.toLowerCase())
      ).map((ability) => ({
        name: ability.name,
        value: ability.name,
      })).slice(0, 10)

      return interaction.respond(choices).catch(() => {})
    }
  }


  /**
   * Get costumes with the desired abilities
   * @param value
   * @param type
   * @returns
   */
  getCostumesByAbilities(firstAbility: string, secondAbility: string = '') {
    return this.costumes.filter((costume) => {
      const hasFirstAbility = costume.costume_ability_link.some((ability) => ability.costume_ability.name === firstAbility)
      const hasSecondAbility = costume.costume_ability_link.some((ability) => ability.costume_ability.name === secondAbility)

      if (!secondAbility) {
        return hasFirstAbility
      }

      return hasFirstAbility && hasSecondAbility
    })
  }

  /**
   * Get costumes with the desired abilities
   * @param value
   * @param type
   * @returns
   */
  getWeaponsByAbilities(firstAbility: string, secondAbility: string = '') {
    return this.weapons.filter((costume) => {
      const hasFirstAbility = costume.weapon_ability_link.some((ability) => ability.weapon_ability.name === firstAbility)
      const hasSecondAbility = costume.weapon_ability_link.some((ability) => ability.weapon_ability.name === secondAbility)

      if (!secondAbility) {
        return hasFirstAbility
      }

      return hasFirstAbility && hasSecondAbility
    })
  }

  async run (interaction: ChatInputCommandInteraction): Promise<void> {
    const selectedType = interaction.options.getString('type') as 'weapons' | 'costumes'
    const firstAbility = interaction.options.getString('first-ability')
    const secondAbility = interaction.options.getString('second-ability')

    if (!firstAbility) {
      const embed = new EmbedBuilder()
        .setDescription('You need to fill at least the first ability sweetie!')
        .setColor(Colors.Red)

      interaction.reply({
        embeds: [embed],
        ephemeral: true,
      })

      return
    }

    const embeds = []
    const pageSize = 10
    let currentPage = 1
    let totalPage = 1
    let totalLength = 0


    if (selectedType === 'costumes') {
      const costumes = this.getCostumesByAbilities(firstAbility, secondAbility)
      totalLength = costumes.length
      totalPage = Math.round(totalLength / pageSize) || 1

      let i = 1;
      while (costumes.length > 0) {
        const batchCostumes = costumes.splice(0, pageSize)

        const embed = new EmbedBuilder()
          .setTitle(`${totalLength} costume${totalLength > 1 ? 's' : ''} found with "${firstAbility}"${secondAbility ? ` and "${secondAbility}"` : ''} ${secondAbility ? 'abilities' : 'ability'}`)
          .setDescription(
            `${batchCostumes.map((costume) => `${emojis[urlSlug(costume.character.name)]} [${costume.character.name} - ${costume.title}](${`https://nierrein.guide/characters/${urlSlug(costume.character.name)}/${urlSlug(costume.title)}`})\n${emojis.ability} \`${costume.costume_ability_link.map((ability) => ability.costume_ability.name).join(', ')}\``).join('\n')}`
          )
          .setFooter({
            text: `Page ${i}/${totalPage}`
          })

        embeds.push(embed)
        i++
      }
    }

    if (selectedType === 'weapons') {
      const weapons = this.getWeaponsByAbilities(firstAbility, secondAbility)
      totalLength = weapons.length
      totalPage = Math.round(totalLength / pageSize) || 1

      let i = 1;
      while (weapons.length > 0) {
        const batchWeapons = weapons.splice(0, pageSize)

        const embed = new EmbedBuilder()
          .setTitle(`${totalLength} weapon${totalLength > 1 ? 's' : ''} found with "${firstAbility}"${secondAbility ? ` and "${secondAbility}"` : ''} ${secondAbility ? 'abilities' : 'ability'}`)
          .setDescription(
            `${batchWeapons.map((weapon) => `${emojis[weapon.attribute]}${emojis[weapon.weapon_type]} [${weapon.name}](${`https://nierrein.guide/weapons/${weapon.slug}`})\n${emojis.ability} \`${weapon.weapon_ability_link.map((ability) => ability.weapon_ability.name).join(', ')}\``).join('\n')}`
          )
          .setFooter({
            text: `Page ${i}/${totalPage}`
          })

        embeds.push(embed)
        i++
      }
    }

    const paginationRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('previous')
          .setLabel('Previous')
          .setDisabled(currentPage === 1)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setDisabled(totalPage === 1)
          .setStyle(ButtonStyle.Primary),
      )

    const selectItemsRow = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('search-select-item')
        .setPlaceholder(`View ${selectedType === 'costumes' ? 'costume' : 'weapon'}...`)
        .addOptions([
          {
            value: 'wip',
            label: 'Work In Progress',
            description: 'This will be available in the near future.',
            emoji: '🚧',
          },
        ])
        .setDisabled(true)
    )

    const message = await interaction.reply({
      embeds: [embeds[0]],
      components: [selectItemsRow, paginationRow]
    })

    const paginationCollector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60 * 1000 * 10,
    })

    paginationCollector.on('collect', (newInteraction) => {
      if (newInteraction.customId === 'previous') {
        currentPage--
      }

      if (newInteraction.customId === 'next') {
        currentPage++
      }

      const newPaginationRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('previous')
          .setLabel('Previous')
          .setDisabled(currentPage === 1)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setDisabled(currentPage === totalPage)
          .setStyle(ButtonStyle.Primary),
      )

      newInteraction.update({
        embeds: [embeds[currentPage - 1]],
        components: [selectItemsRow, newPaginationRow]
      })
    })

    paginationCollector.on('end', () => {
      interaction.editReply({
        components: [],
      })
    })
  }
}
