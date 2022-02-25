const express = require('express')
const app = express()
const config = require('./config.json')
    const { Client, Intents, MessageEmbed } = require('discord.js')
const {
  NoSubscriberBehavior,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnectionStatus,
  joinVoiceChannel,
} = require('@discordjs/voice')
const { getAudioDurationInSeconds } = require('get-audio-duration')
const fs = require('fs')
const dotenv = require('dotenv')
dotenv.config()
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS] })
const servers = []
const configPage = 10
const arrows = ['◀️', '▶️'] 
const emotes = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
let page = 0
const prefix = config.PREFIX

app.get('/', (req, res) => {
  const ping = new Date()

  ping.setHours(ping.getHours() - 3)

  console.log(`Ping as: ${ping.getUTCHours()}:${ping.getUTCMinutes()}:${ping.getUTCSeconds()}`)

  res.sendStatus(200)
})

app.listen(process.env.PORT)

console.log(`Running in ${process.env.PORT} PORT`)

const separate = (base, max) => {
  var res = []
  for (let i=0; i<base.length; i+=max) {
     res.push(base.slice(i,i+max))
  }
  return res
}

const getServers = (voiceChannels, entryVoiceChannels, page) => {
  const res = []
  voiceChannels.map(c => {
    let line = emotes[c.rawPosition % configPage] + ' - '
    entryVoiceChannels.indexOf(c.id) > -1 ? line += '✅' : line += '❌'
    line += ' ' + c.name
    
    res.push(line)
  })
  const separateChannels = separate(res, configPage)
  return [separateChannels[page].join('\n'), separateChannels[page].length, separateChannels.length]
}

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

const saveNewServer = (guildId, channels) => {
  fs.readFile('./serverList.json', 'utf8', (err, data) => {
    if (err) {
      console.log('Error read file: ', err)
    } else {
      const valuesFile = JSON.parse(data)
      const control = 0
      valuesFile.map(x => {if (x.id === guildId) control = 1})
      if (control == 0) valuesFile.push({id: guildId, activeVoiceChannels: channels.map(c => c.id)})
      const writeFile = JSON.stringify(valuesFile)
      fs.writeFile('./serverList.json', writeFile, () => { })
      console.log('File writed fineshed')
    }
  })
}

const deleteServer = (guildId) => {
  delete servers[guildId]
  
  fs.readFile('./serverList.json', 'utf8', (err, data) => {
    if (err) {
      console.log('Error load servers registers: ', err)
    } else {
        const valuesFile = JSON.parse(data)
        valuesFile.map(x => {if (x.id === guildId) valuesFile.splice(valuesFile.findIndex(x => x.id === guildId), 1)}  )
        const writeFile = JSON.stringify(valuesFile)
        fs.writeFile('./serverList.json', writeFile, () => { })
    }
  })

}

const loadServers = () => {
  fs.readFile('./serverList.json', 'utf8', (err, data) => {
    if (err) {
      console.log('Error load servers registers: ', err)
    } else {
      const valuesFile = JSON.parse(data)
      for (let i in valuesFile) {
        servers[valuesFile[i].id] = {
          conn: null,
          dispatcher: null,
          player: null,
          activeVoiceChannels: valuesFile[i].activeVoiceChannels
        }
      }
      console.log('Load servers fineshed...')
    }
  })
}

const updateChannels = (guildId) => {
  fs.readFile('./serverList.json', 'utf8', (err, data) => {
    if (err) {
      console.log('Error read file: ', err)
    } else {
      const valuesFile = JSON.parse(data)
      valuesFile.map(x => {if (x.id === guildId) x.activeVoiceChannels = servers[x.id].activeVoiceChannels})
      const writeFile = JSON.stringify(valuesFile)
      fs.writeFile('./serverList.json', writeFile, () => { })
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
    player: null,
    activeVoiceChannels: null
  }

  saveNewServer(guild.id, guild.channels.cache.filter(c => c.type == 'GUILD_VOICE').sort((a, b) => {return a.rawPosition - b.rawPosition}))
})

client.on('guildDelete', (guild) => {  
  deleteServer(guild.id)
})

client.on('messageCreate', async msg => {
  if (!msg.guild) return
  if (!msg.content.startsWith(prefix)) return
  const guildId = msg.guild.id
  if (msg.content === prefix + ' canais') {
    const voiceChannels = msg.guild.channels.cache.filter(c => c.type == 'GUILD_VOICE').sort((a, b) => {return a.rawPosition - b.rawPosition})
    const serverIcon =  msg.guild.iconURL()
    const serverBanner = msg.guild.bannerURL()
    const serverName = msg.guild.name
    const channelsEmbed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle(serverName)
      .setURL('https://discord.js.org/')
      .setAuthor(
        { 
          name: 'Olha ele ai', 
          iconURL: 'https://cdn.discordapp.com/app-icons/941684090485227531/8d9ec75c03439a0173b09ee04b839c35.png?size=256', 
          url: 'https://top.gg/bot/938038772946313247' 
        })
      .setDescription('Servidores:' + '\n' + getServers(voiceChannels, servers[guildId].activeVoiceChannels, page)[0])
      .setThumbnail(serverBanner ? serverBanner : serverIcon) 
      .setTimestamp()
      .setFooter({ text: 'Aqui a quantidade de canais de voz adicionados', iconURL: serverIcon })



      msg.guild.channels.cache.get(msg.channelId).send({ embeds: [channelsEmbed] }).then(async embedMessage => {
        let positionsVoiceChannels = getServers(voiceChannels, servers[guildId].activeVoiceChannels, page)[1]
        const  filter = async (reaction, user) => {
          if (user.bot) return;
          positionsVoiceChannels = getServers(voiceChannels, servers[guildId].activeVoiceChannels, page)[1]
            if (emotes.includes(reaction.emoji.name)) {
              let channelId
              voiceChannels.map(c => {
                  if (c.rawPosition === (page * configPage) + emotes.indexOf(reaction.emoji.name)) channelId = c.id
              })

              if (channelId) {
                if (servers[guildId].activeVoiceChannels.indexOf(channelId) > -1) 
                  servers[guildId].activeVoiceChannels.splice(servers[guildId].activeVoiceChannels.indexOf(channelId), 1)
                else 
                  servers[guildId].activeVoiceChannels.push(channelId)
              }
            }
            
            if (reaction.emoji.name === arrows[0] && page > 0) page -= 1
            if (reaction.emoji.name === arrows[1] && page < getServers(voiceChannels, servers[guildId].activeVoiceChannels, page)[2] - 1) page += 1

            embedMessage.edit({embeds:[channelsEmbed.setDescription('Servidores:' + '\n' + getServers(voiceChannels, servers[guildId].activeVoiceChannels, page)[0])]})
            const userReactions = embedMessage.reactions.cache.filter(reaction => reaction.users.cache.has(user.id))
            for (const reaction of userReactions.values()) {
              reaction.users.remove(user.id)
            }
        }

        embedMessage.react(arrows[0])

        for (i=0; i < positionsVoiceChannels; i++) embedMessage.react(emotes[i])
            
        embedMessage.react(arrows[1])

        await embedMessage.awaitReactions({filter, time: 300_000}).then(() => [embedMessage.reactions.removeAll(), updateChannels(guildId)])

      })

    }
})

client.on('voiceStateUpdate', async (oldState, newState) => {
  let guildId = newState.guild.id
  if (oldState.member.user.bot) return
  let newStatechannelId = newState.channelId
  let oldStatechannelId = oldState.channelId
  if (servers[guildId].activeVoiceChannels.indexOf(newStatechannelId) === -1) return  
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