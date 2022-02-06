const express = require('express')
const app = express()
const config = require('./config.json')
const { Client, Intents } = require('discord.js')
const {
  NoSubscriberBehavior,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  entersState,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  joinVoiceChannel,
} = require('@discordjs/voice')
const { getAudioDurationInSeconds } = require('get-audio-duration')
const fs = require('fs')
const dotenv = require('dotenv')
dotenv.config()
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] })
const servers = []

app.get('/', (req, res) => {
  const ping = new Date()

  ping.setHours(ping.getHours() - 3)

  console.log(`Ping as: ${ping.getUTCHours()}:${ping.getUTCMinutes()}:${ping.getUTCSeconds()}`)

  res.sendStatus(200)
})
app.listen(process.env.PORT)
console.log(`Running in ${process.env.PORT} PORT`)

const conChannel = async (channel, channelId) => {
  const conn = joinVoiceChannel({
    channelId: channelId,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator
  })
  try {
    await entersState(conn, VoiceConnectionStatus.Ready, 30_000);
    return conn
  } catch (error) {
    if (conn._state.status != 'destroyed') conn.destroy()
    throw error
  }
}

const saveNewServer = (guildId) => {
  fs.readFile('./serverList.json', 'utf8', (err, data) => {
    if (err) {
      console.log('Error read file: ', err)
    } else {
      const valuesFile = JSON.parse(data)
      if (!valuesFile.servers.includes(guildId)) valuesFile.servers.push(guildId)
      const writeFile = JSON.stringify(valuesFile)
      console.log(writeFile)
      fs.writeFile('./serverList.json', writeFile, () => { })
      console.log('File writed fineshed')
    }
  })
}

const loadServers = () => {
  fs.readFile('./serverList.json', 'utf8', (err, data) => {
    if (err) {
      console.log('Error load servers registers: ', err)
    } else {
      const valuesFile = JSON.parse(data)
      for (let i in valuesFile.servers) {
        servers[valuesFile.servers[i]] = {
          conn: null,
          dispatcher: null,
          player: null
        }
      }
      console.log('Load servers fineshed...')
    }
  })
}

client.on('ready', async () => {
  loadServers()
  console.log('discord.js client is ready!')
  let activities = [`lo-fi`, `code with lo-fi`, `relax and code`], i = 0

  setInterval(() => client.user.setActivity(`${activities[i++ % activities.length]}`, { type: "STREAMING", url: "https://www.youtube.com/watch?v=DWcJFNfaw9c" }), 5000)
})

client.on('guildCreate', (guild) => {
  servers[guild.id] = {
    conn: null,
    dispatcher: null,
    player: null
  }
  saveNewServer(guild.id)
})

client.on('voiceStateUpdate', async (oldState, newState) => {
  let guildId = newState.guild.id
  if (oldState.member.user.bot) return;
  let newStatechannelId = newState.channelId
  let oldStatechannelId = oldState.channelId
  try {
    const duration = await getAudioDurationInSeconds('./meme.mp3')

    if ((oldStatechannelId === null && newStatechannelId !== null) || (oldStatechannelId !== null && newStatechannelId !== null && oldStatechannelId !== newStatechannelId)) {
      servers[guildId].conn = await conChannel(newState, newStatechannelId)
      servers[guildId].player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause,
        },
      })
      servers[guildId].resource = createAudioResource('./meme.mp3')
      servers[guildId].dispatcher = servers[guildId].player.play(servers[guildId].resource)
      servers[guildId].conn.subscribe(servers[guildId].player)

      setTimeout(() => {
        try {
          if (servers[guildId].conn._state.status != 'destroyed') servers[guildId].conn.destroy()
        } catch (e) {
          console.log('exit...')
          if (servers[guildId].conn._state.status != 'destroyed') servers[guildId].conn.destroy()
        }
      }, duration * 1000 + 500)
    }
  } catch (e) {
    console.log('Exceeded...')
  }
})

client.login(process.env.TOKEN)