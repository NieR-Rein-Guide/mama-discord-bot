import { SlashCommandBuilder } from '@discordjs/builders'
import { ActionRowBuilder, AutocompleteInteraction, ChatInputCommandInteraction, Colors, ComponentType, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js'
import getCostumeEmbed from '../utils/getCostumeEmbed'
import { ApiCostume, ApiTierlistItem, ApiWeapon, BaseDiscordCommand, BotIndexes, debris, Event } from '../..'
import { CDN_URL, emojis, FEATURED_TIERLISTS, RARITY } from '../config'
import api from '../libs/api'
import getWeaponEmbed from '../utils/getWeaponEmbed'
import urlSlug from 'slugg'
import Fuse from 'fuse.js'
import Weapon from './Weapon'

export default class Costume implements BaseDiscordCommand {
  data = new SlashCommandBuilder()
    .setName('costume')
    .setDescription('View costume details')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Costume name to search for')
        .setRequired(true)
        .setAutocomplete(true))
        .addStringOption(option =>
          option.setName('view')
            .setDescription('Select which information to view first')
            .setRequired(false)
            .addChoices(
              { name: '🧑 Costume', value: 'costume_info' },
              { name: '📜Costume skills and abilities', value: 'costume_skills' },
              { name: '⚔️ Costume weapon', value: 'costume_weapon' },
              { name: '⚔️📜 View Weapon skills and abilities', value: 'weapon_skills' },
              { name: '📊 Tierlist', value: 'tierlist_info' },
              { name: '📍 Sources', value: 'costume_sources' },
              { name: '📚 View weapon stories', value: 'weapon_stories' },
              { name: '🖼️ View costume full artwork', value: 'costume_artwork' },
            ))
      .addNumberOption(option =>
        option.setName('awakening_step')
          .setMinValue(0)
          .setMaxValue(5)
          .setDescription('Select which awakening level (default: no awakening)')
          .setRequired(false))
      .addBooleanOption(option =>
        option.setName('is_exalted')
          .setDescription('Whether or not to show exalted stats (default: no exalt)'))

  costumes: ApiCostume[] = [];
  characters: string[] = [];
  index: BotIndexes['costumesSearch']
  optionsLabels = {
    costume_info: '🧑 View Costume',
    costume_skills: '📜 View skills and abilities',
    costume_weapon: '⚔️ View Weapon',
    weapon_skills: '⚔️📜 View Weapon skills and abilities',
    tierlist_info: '📊 View Tierlist position',
    costume_sources: '📍 View costume sources',
    costume_story: '📚 View costume story',
    costume_artwork: '🖼️ View costume full artwork',
  }

  constructor(costumes: ApiCostume[], index: BotIndexes['costumesSearch']) {
    this.costumes = costumes;
    this.characters = costumes.reduce((characters, costume) => {
      if (characters.includes(costume.character.name.toLowerCase())) {
        return characters;
      }

      characters.push(costume.character.name.toLowerCase());
      return characters;
    }, [])
    this.index = index;
  }

  async autocomplete (interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused();
    const choices = this.index.search(focusedValue)
      .map(item => item.item)
      .map(choice => ({
        name: `${choice.is_ex_costume ? 'EX ' : ''}${choice.character.name} - ${choice.title} (${new Array(RARITY[choice.rarity]).fill('★').join('')})`,
        value: `${choice.costume_id}`
      }))
      .slice(0, 10)

    await interaction.respond(choices).catch(() => {});
  }

  static getCostumeSkillsEmbed(embed: EmbedBuilder, costume: ApiCostume, costumeDebris: debris) {
    let costumeSkillsDescription = ''
    costumeSkillsDescription += `\`Skill\`\n${emojis.skill} __${costume.costume_skill_link[0].costume_skill.name}__ (Gauge ${costume.costume_skill_link[0].costume_skill.gauge_rise_speed}) [${costume.costume_skill_link[0].costume_skill.cooldown_time}-${costume.costume_skill_link[0].costume_skill.cooldown_time * 0.8}]\n${costume.costume_skill_link[0].costume_skill.description}`

    costumeSkillsDescription += `\n\n\`Abilities\`\n${[...costume.costume_ability_link].splice(0, 2).map(ability => `${emojis.ability} [**${ability.costume_ability.name}**](https://nierrein.guide/ability/costume/${urlSlug(ability.costume_ability.name)}-${ability.costume_ability.ability_id})\n${ability.costume_ability.description}`).join('\n')}`

    if (costume.costume_ability_link[2]) {
      const awakeningAbility = costume.costume_ability_link[2]
      costumeSkillsDescription += `\n\n${emojis.awakening3} \`Awakening Ability\`\n${emojis.ability} ${`**${awakeningAbility.costume_ability.name}**\n${awakeningAbility.costume_ability.description}`}`
    }

    if (costumeDebris) {
      costumeSkillsDescription += `\n\n${emojis.awakening5} \`Debris\`\n${emojis.ability} **${costumeDebris.name.replace('Debris: ', '')}**\n ${costumeDebris.description_long}`
    }

    return EmbedBuilder.from(embed)
      .setDescription(costumeSkillsDescription)
  }

  async run (interaction: ChatInputCommandInteraction): Promise<void> {
    const id = interaction.options.getString('name')
    const selectedView = interaction.options.getString('view') || 'costume_info'
    const awakeningStep = interaction.options.getNumber('awakening_step') || 0
    const isExalted = interaction.options.getBoolean('is_exalted')
    let hasCharacterName = ''

    const match = new RegExp(this.characters.join("|"))
    .exec(id.toLowerCase())
    if (match && match.length > 0) {
      hasCharacterName = match[0]
    }

    const options = [
      {
        label: this.optionsLabels.costume_info,
        description: 'Costume stats and abilities',
        value: 'costume_info',
      },
    ]

    let customMessage = '';
    const embeds = new Map()

    /**
     * Costume
     */
    let costume = this.costumes.find((costume) => `${costume.costume_id}` === id)

    if (!costume) {
      let result: ApiCostume;
      if (hasCharacterName) {
        const costumesOfCharacter = this.costumes.filter((costume) => costume.character.name.toLowerCase() === hasCharacterName)
        const customIndex = new Fuse(costumesOfCharacter, {
          keys: ['title'],
          includeScore: true,
        })

        const needle = id.toLowerCase().replace(hasCharacterName, '');

        const [firstResult] = customIndex.search(needle);
        result = firstResult.item;
      } else {
        const [firstResult] = this.index.search(id)
        result = firstResult.item;
      }

      customMessage = `Closest match for custom keyword: \`${id}\``;

      if (!result) {
        const embed = new EmbedBuilder()
          .setDescription(`I am sorry, Mama could not find anything useful for \`${id}\``)
          .setColor(Colors.Red)

        interaction.reply({
          embeds: [embed],
          ephemeral: true,
        })

        console.log(`${interaction.user.username}#${interaction.user.discriminator} used "/costume <${id}> <${selectedView}>" but no costume found. [in Guild:${interaction.guild?.name}]`)
        return
      }

      costume = result;
    }

    console.log(`${interaction.user.username}#${interaction.user.discriminator} used "/costume <${id}> <${selectedView}>" to reference ${costume?.character?.name} - ${costume?.title} [in Guild:${interaction.guild?.name}]`)

    const [costumeWeaponData, costumeDebrisData, costumeSourceData] = await Promise.all([
      api.get(`/costume/weapon/${costume.costume_id}`),
      api.get(`/costume/debris/${costume.costume_id}`),
      api.get(`/costume/source/${costume.costume_id}`),
    ])
    const costumeWeapon: ApiWeapon = costumeWeaponData?.data
    const costumeDebris = costumeDebrisData?.data as debris
    const costumeSources = costumeSourceData?.data as Event[]
    const costumeEmbed = getCostumeEmbed(costume, costumeWeapon, costumeDebris, awakeningStep, isExalted)
    embeds.set('costume_info', costumeEmbed)

    /**
     * Costume skill and abilities
     */

    const costumeSkillsEmbed = Costume.getCostumeSkillsEmbed(costumeEmbed, costume, costumeDebris)

    embeds.set('costume_skills', costumeSkillsEmbed)
    options.push({
      label: this.optionsLabels.costume_skills,
      description: 'Costume skill and abilities',
      value: 'costume_skills',
    })

    /**
     * Costume story
     */

    const costumeStoryEmbed = EmbedBuilder.from(costumeEmbed)
    costumeStoryEmbed.setDescription(
      costume.description
        .replaceAll('\\n', ' ')
    )

    embeds.set('costume_story', costumeStoryEmbed)
    options.push({
      label: this.optionsLabels.costume_story,
      description: 'View costume story',
      value: 'costume_story',
    })

    /**
     * Costume sources
    */
   if (costumeSources.length > 0) {
    const costumeSourcesEmbed = EmbedBuilder.from(costumeEmbed)
    costumeSourcesEmbed.data.description = undefined;
    costumeSourcesEmbed.addFields(
      costumeSources.map((source) => ({
        name: source.attributes.title,
        value: `Start: <t:${new Date(source.attributes.start_date).getTime() / 1000}:R>\nEnd: <t:${new Date(source.attributes.end_date).getTime() / 1000}:R>`,
      }))
    )
    if (costumeSources?.[0]?.attributes?.image?.data?.attributes?.url) {
      costumeSourcesEmbed.setImage(costumeSources?.[0]?.attributes?.image?.data?.attributes?.url)
    }

    embeds.set('costume_sources', costumeSourcesEmbed)
     options.push({
       label: this.optionsLabels.costume_sources,
       description: 'View costume sources',
       value: 'costume_sources',
     })
    }

    /**
     * Weapon
     */

    if (costumeWeapon?.weapon_id) {
      const weaponEmbed = getWeaponEmbed(costumeWeapon, costume)
      embeds.set('costume_weapon', weaponEmbed)
      options.push({
        label: this.optionsLabels.costume_weapon,
        description: 'Costume\'s weapon stats and abilities',
        value: 'costume_weapon',
      })

       /**
       * Weapon skills
       */
      const weaponSkillsEmbeds = Weapon.getWeaponSkillsEmbed(weaponEmbed, costumeWeapon)

      embeds.set('weapon_skills', weaponSkillsEmbeds)
      options.push({
        label: this.optionsLabels.weapon_skills,
        description: 'Weapon\'s skills',
        value: 'weapon_skills',
      })
    }

    /**
     * Tierlists
     */

     const tierlistsItemsResponse = await api.get(`/tierlists/item/${costume.costume_id}`).catch(() => undefined)

     const tierlistsItems: ApiTierlistItem[] = tierlistsItemsResponse?.data

     const hasPinnedTierlists = tierlistsItems?.some((tierlistItem) => {
      const tierlistId = tierlistItem.tiers.tierslists.tierlist_id
      const isPve = FEATURED_TIERLISTS.pve.includes(tierlistId)
      const isPvp = FEATURED_TIERLISTS.pvp.includes(tierlistId)

      if (isPve || isPvp) {
        return true
      }

      return false
     })

     if (hasPinnedTierlists) {

      options.push({
        label: this.optionsLabels.tierlist_info,
        description: 'Costume\'s tierlist position',
        value: 'tierlist_info',
      })

      let description = '';

      for (const tierlistItem of tierlistsItems) {
        const tierlistId = tierlistItem.tiers.tierslists.tierlist_id
        const isPve = FEATURED_TIERLISTS.pve.includes(tierlistId)
        const isPvp = FEATURED_TIERLISTS.pvp.includes(tierlistId)
        if (isPve || isPvp) {
          description += `\n• [${isPvp ? 'PvP - ': ''}${tierlistItem.tiers.tierslists.title}](https://nierrein.guide/tierlist/${tierlistItem.tiers.tierslists.slug}?highlight=${costume.costume_id}): **${tierlistItem.tiers.tier}**`
         }
       }

      const embed = EmbedBuilder.from(costumeEmbed)
        .setDescription(description)
      embeds.set('tierlist_info', embed)
     }

    /**
     * Artworks
     */
    const costumeArtworkEmbed = EmbedBuilder.from(costumeEmbed)
    costumeArtworkEmbed.data.description = undefined
    costumeArtworkEmbed.data.thumbnail = undefined;
    embeds.set('costume_artwork', costumeArtworkEmbed)

    options.push({
      label: this.optionsLabels.costume_artwork,
      description: 'Costume\'s full artwork',
      value: 'costume_artwork',
    })

    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('costume-pagination')
          .setPlaceholder(this.optionsLabels[selectedView])
          .addOptions(options)
      )

    const message = await interaction.reply({
      files: selectedView === 'costume_artwork' ? [`${CDN_URL}${costume.image_path_base}full.png`] : [],
      embeds: [embeds.get(selectedView)],
      components: [row],
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
          .setCustomId('costume-pagination')
          .setPlaceholder(this.optionsLabels[value])
          .addOptions(options)
      )

      console.log(`${newInteraction.user.username}#${newInteraction.user.discriminator} updated existing embed "/costume <${id}> <${selectedView}>" to view ${value} - ${costume?.character?.name} - ${costume?.title} [in Guild:${newInteraction.guild?.name}]`)


      newInteraction.update({
        files: value === 'costume_artwork' ? [`${CDN_URL}${costume.image_path_base}full.png`] : [],
        embeds: [embeds.get(value)],
        components: [row],
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
