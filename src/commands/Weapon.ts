import { SlashCommandBuilder } from '@discordjs/builders'
import { ActionRowBuilder, AutocompleteInteraction, ChatInputCommandInteraction, Colors, ComponentType, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js'
import getWeaponEmbed from '../utils/getWeaponEmbed'
import { ApiCostume, ApiWeapon, BaseDiscordCommand, BotIndexes, debris, Event } from '../..'
import { emojis, RARITY, WEAPON_TYPE_WORDS } from '../config'
import api from '../libs/api'
import getCostumeEmbed from '../utils/getCostumeEmbed'
import urlSlug from 'slugg'
import Costume from './Costume'

export default class Weapon implements BaseDiscordCommand {
  data = new SlashCommandBuilder()
    .setName('weapon')
    .setDescription('View weapon details')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Weapon name to search for')
        .setRequired(true)
      .setAutocomplete(true))
      .addStringOption(option =>
        option.setName('view')
          .setDescription('Select which information to view first')
          .setRequired(false)
          .addChoices(
            { name: '⚔️ View Weapon', value: 'weapon_info' },
            { name: '📜 View skills and abilities', value: 'weapon_skills' },
            { name: '📚 View weapon stories', value: 'weapon_stories' },
            { name: '🧑 View Costume', value: 'weapon_costume' },
            { name: '🧑📜 View Costume skills and abilities', value: 'costume_skills' },
            { name: '📍 View weapon sources', value: 'weapon_sources' },
      ))
    .addBooleanOption(option =>
      option.setName('is_refined')
        .setDescription('Whether or not to show refined stats (default: no refine)'))
    .addNumberOption(option =>
      option.setName('costume_awakening_step')
        .setMinValue(0)
        .setMaxValue(5)
        .setDescription('Select which costume awakening level (default: no awakening)')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('costume_is_exalted')
        .setDescription('Whether or not to show costume exalted stats (default: no exalt)'))


  costumes: ApiWeapon[] = []
  index: BotIndexes['weaponsSearch']
  optionsLabels = {
    weapon_info: '⚔️ View Weapon',
    weapon_skills: '📜 View skills and abilities',
    weapon_stories: '📚 View weapon stories',
    weapon_costume: '🧑 View Costume',
    costume_skills: '🧑📜 View costume skills and abilities',
    weapon_sources: '📍 View weapon sources',
  }

  constructor(costumes: ApiWeapon[], index: BotIndexes['weaponsSearch']) {
    this.costumes = costumes;
    this.index = index;
  }

  async autocomplete (interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused();
    const choices = this.index.search(focusedValue)
      .map(item => item.item)
      .map(choice => ({
        name: `[${WEAPON_TYPE_WORDS[choice.weapon_type]}] -${choice.is_ex_weapon ? 'EX' : ''} ${choice.name} (${new Array(RARITY[choice.rarity]).fill('★').join('')})`,
        value: `${choice.weapon_id}`
      }))
      .slice(0, 10)

    interaction.respond(choices).catch(() => {})
  }

  static getWeaponSkillsEmbed(embed: EmbedBuilder, weapon: ApiWeapon) {
    let weaponSkillsDescription = ''

    weaponSkillsDescription += `\n\n\`Skills\`:\n${[...weapon.weapon_skill_link].splice(0, 2).map(skill => `${emojis.skill} __${skill.weapon_skill.name}__ (*${skill.weapon_skill.cooldown_time / 30}sec*)\n${skill.weapon_skill.description}`).join('\n')}`

    weaponSkillsDescription += `\n\n\`Abilities\`:\n${[...weapon.weapon_ability_link].splice(0, 2).map(ability => `${emojis.ability} [**${ability.weapon_ability.name}**](https://nierrein.guide/ability/weapon/${urlSlug(ability.weapon_ability.name)}-${ability.weapon_ability.ability_id}) \n${ability.weapon_ability.description}`).join('\n')}`

    if (weapon.weapon_ability_link.some((ability) => ability.slot_number === 3)){
      weaponSkillsDescription += `\n${[...weapon.weapon_ability_link].filter((ability) => ability.slot_number === 3).map(ability => `${emojis.ability} [**${ability.weapon_ability.name}**](https://nierrein.guide/ability/weapon/${urlSlug(ability.weapon_ability.name)}-${ability.weapon_ability.ability_id}) \n${ability.weapon_ability.description}`).join('\n')}`
    }

    if (weapon.weapon_ability_link.some((ability) => ability.slot_number === 4)) {
      weaponSkillsDescription += `\n\n\`Refining ability\`:\n${[...weapon.weapon_ability_link].filter((ability) => ability.slot_number === 4).map(ability => `${emojis.ability} [**${ability.weapon_ability.name}**](https://nierrein.guide/ability/weapon/${urlSlug(ability.weapon_ability.name)}-${ability.weapon_ability.ability_id}) \n${ability.weapon_ability.description}`).join('\n')}`
    }

    const weaponSkillsEmbeds = EmbedBuilder.from(embed)
      .setDescription(weaponSkillsDescription)

    return weaponSkillsEmbeds
  }

  async run (interaction: ChatInputCommandInteraction): Promise<void> {
    const id = interaction.options.getString('name')
    let selectedView = interaction.options.getString('view') || 'weapon_info'
    const isRefined = interaction.options.getBoolean('is_refined')
    const awakeningStep = interaction.options.getNumber('costume_awakening_step') || 0
    const isExalted = interaction.options.getBoolean('costume_is_exalted')

    const options = [
      {
        label: this.optionsLabels.weapon_info,
        description: 'Weapon stats and abilities',
        value: 'weapon_info',
      },
    ]

    let customMessage = '';
    const embeds = new Map()

    /**
     * Weapon
     */
     let weapon = this.costumes.find((weapon) => `${weapon.weapon_id}` === id)

     if (!weapon) {
      const [firstResult] = this.index.search(id)

      customMessage = `Closest match for custom keyword: \`${id}\``;

      if (!firstResult) {
        const embed = new EmbedBuilder()
          .setDescription(`I am sorry, Mama could not find anything useful for \`${id}\``)
          .setColor(Colors.Red)

        interaction.reply({
          embeds: [embed],
          ephemeral: true,
        })

        console.log(`${interaction.user.username}#${interaction.user.discriminator} used "/weapon <${id}> <${selectedView}>" but no weapon found. [in Guild:${interaction.guild?.name}]`)
        return
      }

      weapon = firstResult.item as ApiWeapon
     }

     const weaponCostumeData = await api.get(`/weapon/costume/${weapon.weapon_id}`).catch(() => undefined)
     const weaponCostume: ApiCostume = weaponCostumeData?.data

     console.log(`${interaction.user.username}#${interaction.user.discriminator} used "/weapon <${id}> <${selectedView}>" to reference ${weapon?.name} [in Guild:${interaction.guild?.name}]`)

     // No costume found for weapon force switch to weapon_info view
     if (!weaponCostume && selectedView === 'weapon_costume') {
      selectedView = 'weapon_info'
     }

     const weaponEmbed = getWeaponEmbed(weapon, weaponCostume, isRefined)

     embeds.set('weapon_info', weaponEmbed)

     /**
     * Weapon skills
     */
    const weaponSkillsEmbeds = Weapon.getWeaponSkillsEmbed(weaponEmbed, weapon)

    embeds.set('weapon_skills', weaponSkillsEmbeds)
    options.push({
      label: this.optionsLabels.weapon_skills,
      description: 'Weapon\'s skills',
      value: 'weapon_skills',
    })

    /**
     * Weapon stories
     */

    const weaponStoriesEmbed = EmbedBuilder.from(weaponEmbed)

    let weaponStoriesDescription = weapon.weapon_story_link.map((story) => story.weapon_story.story.replaceAll('\\n', ' ')).join('\n\n')

    weaponStoriesEmbed.setDescription(weaponStoriesDescription)

    embeds.set('weapon_stories', weaponStoriesEmbed)
    options.push({
      label: this.optionsLabels.weapon_stories,
      description: 'View weapon stories',
      value: 'weapon_stories',
    })

    /**
     * Weapon's costume
     */

    if (weaponCostume?.costume_id) {
      const costumeDebrisData = await api.get(`/costume/debris/${weaponCostume.costume_id}`)
      const costumeDebris = costumeDebrisData?.data as debris
      const costumeEmbed = getCostumeEmbed(weaponCostume, weapon, costumeDebris, awakeningStep, isExalted)
      embeds.set('weapon_costume', costumeEmbed)
      options.push({
        label: this.optionsLabels.weapon_costume,
        description: 'Weapon\'s costume stats and abilities',
        value: 'weapon_costume',
      })

      /**
       * Costume skill and abilities
       */

      const costumeSkillsEmbed = Costume.getCostumeSkillsEmbed(costumeEmbed, weaponCostume, costumeDebris)

      embeds.set('costume_skills', costumeSkillsEmbed)
      options.push({
        label: this.optionsLabels.costume_skills,
        description: 'Costume skill and abilities',
        value: 'costume_skills',
      })
    }

     /**
       * Weapon sources
      */

    const weawponSourcesData = await api.get(`/weapon/source/${weapon.weapon_id}`)
    const weaponSources = weawponSourcesData?.data as Event[]

    if (weaponSources.length > 0) {
      const weaponSourcesEmbed = EmbedBuilder.from(weaponEmbed)
      weaponSourcesEmbed.setDescription(`:warning: Experimental feature (some of them might be incorrect)\n${weaponSources.length} potential sources found.`)
      weaponSourcesEmbed.addFields(
        weaponSources.map((source) => ({
          name: source.attributes.title,
          value: `Start: <t:${new Date(source.attributes.start_date).getTime() / 1000}:R>\nEnd: <t:${new Date(source.attributes.end_date).getTime() / 1000}:R>`,
        }))
      )

      if (weaponSources?.[0]?.attributes?.image?.data?.attributes?.url) {
        weaponSourcesEmbed.setImage(weaponSources?.[0]?.attributes?.image?.data?.attributes?.url)
      }

      embeds.set('weapon_sources', weaponSourcesEmbed)
      options.push({
        label: this.optionsLabels.weapon_sources,
        description: 'View potential weapon sources',
        value: 'weapon_sources',
      })
      }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('weapon-pagination')
          .setPlaceholder('Weapon info')
          .addOptions(options)
      )

    const message = await interaction.reply({
      embeds: [embeds.get(selectedView)],
      components: embeds.size > 1 ? [row] : [],
      content: customMessage ? customMessage : undefined,
    })

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60 * 1000 * 10,
    })

    collector.on('collect', (newInteraction) => {
      const value = newInteraction.values[0]

      const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('weapon-pagination')
          .setPlaceholder(this.optionsLabels[value])
          .addOptions(options)
      )

      console.log(`${newInteraction.user.username}#${newInteraction.user.discriminator} updated existing embed "/weapon <${id}> <${selectedView}>" to view ${value} - ${weapon?.name} [in Guild:${newInteraction.guild?.name}]`)

      newInteraction.update({
        embeds: [embeds.get(value)],
        components: embeds.size > 1 ? [row] : [],
        content: customMessage ? customMessage : undefined,
      })
    })

    collector.on('end', () => {
      interaction.editReply({
        components: [],
      })
    })
  }
}
