import { Client, Collection, Guild, Interaction, Message, EmbedBuilder } from 'discord.js'
import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import { emojis, formatRegex } from './config'
import { getDataset } from './libs/api'
import { BaseDiscordCommand, BotIndexes } from '..'
import { env } from './env'
import { HELP_DESCRIPTION } from './commands/Help'

export default class Bot {
  apiKey = '' // Discord API Key
  client: Client = null // The Discord Client

  rest = new REST({ version: '9' })

  commands = new Collection<string, BaseDiscordCommand>()

  indexes: BotIndexes = {
    search: null,
    costumesSearch: null,
    weaponsSearch: null,
  }

  constructor (client: Client, apiKey: string) {
    this.client = client
    this.apiKey = apiKey
    this.rest.setToken(apiKey)

    this.client.once('ready', async () => {
      this.initSlashCommands()
    })

    // Add listeners here
    this.client.on('guildCreate', this.onGuildCreate)
    this.client.on('guildDelete', this.onGuildDelete)
    this.client.on('interactionCreate', this.onInteractionCreate)
    this.client.on('messageCreate', this.messageCreate)
  }

  /**
   * Run a / command
   */
  onInteractionCreate = async (interaction: Interaction): Promise<void> => {
    try {
      if (interaction.isAutocomplete()) {
        const command = this.commands.get(interaction.commandName)
        await command.autocomplete(interaction)
      }

      if (interaction.isCommand()) {
        const command = this.commands.get(interaction.commandName)
        await command.run(interaction)
      }
    } catch (error) {
      console.error(error, interaction)
      if (interaction.isCommand()) {
        interaction.reply({
          content: 'Sorry, There was an unknown error. Please try again.',
          ephemeral: true
        })
      }
    }
  }

  initSlashCommands = async (): Promise<void> => {
    try {
      console.log('Started refreshing application (/) commands.')

      const body = this.commands.map(command => command.data.toJSON())

      if (env.NODE_ENV === 'development') {
        await this.rest.put(
          Routes.applicationGuildCommands(
            env.DISCORD_CLIENT_ID,
            env.DISCORD_GUILD_ID
          ),
          { body }
        )
      }

      if (env.NODE_ENV === 'production') {
        await this.rest.put(
          Routes.applicationCommands(env.DISCORD_CLIENT_ID),
          { body }
        )
      }

      console.log('Successfully reloaded application (/) commands.')
    } catch (error) {
      console.error(error)
    }
  }

  messageCreate = async (message: Message): Promise<any> => {
    let matches = [...message.content.matchAll(formatRegex)]

    if (matches?.length > 0 ) {
      message.reply({
        content: `I am sorry but Mama doesn't want to support message commands anymore.\n${emojis.mamaDirect} Please use either \`/costume <name> <?view>\` or \`/weapon <name> <?view>\` to view your desired costume/weapon. (:gift: bonus: You can benefit from more features by using slash commands!)\n\n Thank you for your understanding bestie! ${emojis.mamaPlease}`,
      }).catch(() => console.warn(`Could not reply to ${message.member.user.toString()} in ${message.channelId} in guild ${message.guildId}`))
    }
  }

  /**
   * Send some basic instructions on guild join
   */
  onGuildCreate = (guild: Guild): void => {
    console.log(`${this.client.user.username} joined guild "${guild.name}" (id: ${guild.id})`)

    if (!guild.systemChannel) {
      return console.warn(`Could not send "guildCreate" message to ${guild.id}`)
    }

    const embed = new EmbedBuilder()
      .setTitle('Hey besties, thank you for inviting me ! :blush:')
      .setDescription(HELP_DESCRIPTION)
      .setThumbnail('https://cdn.discordapp.com/emojis/822205475009200128.png?size=256')
      .setFooter({
        text: 'See you in The Cage!'
      })
      .setColor(5814783)

    guild.systemChannel.send({ embeds: [embed] })
      .catch(() => console.warn(`Could not send "guildCreate" message to ${guild.id}`))
  }

  /**
   * On guild delete
   */
  onGuildDelete = async (guild: Guild): Promise<void> => {
    console.log(`${this.client.user.username} left guild "${guild.name}" (id: ${guild.id})`)
  }

  /**
   * Add a command to the bot's list
   *
   * @param {Object} command
   * @returns
   * @memberof Bot
   */
  addCommand = (command: BaseDiscordCommand): this => {
    this.commands.set(command.data.name, command)
    return this
  }

  /**
   * Tasks to run before connecting the bot
   */
  prerun = async (): Promise<void> => {
    console.log('Fetching dataset')
    const { search, costumesSearch, weaponsSearch }  = await getDataset()
    this.indexes.search = search;
    this.indexes.costumesSearch = costumesSearch;
    this.indexes.weaponsSearch = weaponsSearch;
    console.log('Dataset is ready')
  }

  /**
   * Run the bot
   *
   * @memberof Bot
   */
  run = async (): Promise<void> => {
    console.log('Connecting to Discord...')
    try {
      await this.prerun()
      await this.client.login(this.apiKey)
    } catch (error) {
      console.error('Error while connecting to Discord :', error)
    }
  }
}
