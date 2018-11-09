const {RTMClient, WebClient} = require('@slack/client')
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3')
const axios = require('axios')

const channels = new Map()

const redditKey = 'VKSUkFl1mWG8ixc0r_KfoOvqEmw'

const sendFunny = async (rtm, message) => {
  const memeList = []
  const results = await axios.get(
    'https://www.reddit.com/r/funny/top.json?limit=100'
  )
  results.data.data.children.forEach(post => {
    if (post.data.url.endsWith('gifv')) {
      memeList.push(post.data.url)
    }
    if (post.data.url.endsWith('gif')) {
      memeList.push(post.data.url)
    }
    if (post.data.url.endsWith('jpg')) {
      memeList.push(post.data.url)
    }
  })
  const meme = memeList[Math.floor(Math.random() * memeList.length)]
  console.log(meme)

  rtm.sendMessage(meme, message.channel)
}

var toneAnalyzer = new ToneAnalyzerV3({
  iam_apikey: 'Un3uBMeNy80H_RjrQbPo_-EH9Ze9Qtg6ABhIZgQD1wWU',
  version: '2017-09-21',
  url: 'https://gateway.watsonplatform.net/tone-analyzer/api/'
})

const token = 'xoxb-2151814398-474354480752-Mbb58wuo5U2ISYdxMzp5A8tD'
const rtm = new RTMClient(token)
rtm.start()
const web = new WebClient(token)

rtm.on('message', event => {
  const message = event
  if (
    (message.subtype && message.subtype === 'bot_message') ||
    (!message.subtype && message.user === rtm.activeUserId)
  ) {
    return
  }

  if (!channels.get(message.channel)) {
    channels.set(message.channel, 0)
  }
  let currentMood = channels.get(message.channel)
  toneAnalyzer.tone(
    {
      tone_input: message.text,
      content_type: 'text/plain'
    },
    function(err, tone) {
      if (err) {
        console.log(err)
      } else {
        console.log(tone.document_tone.tones.length)
        tone.document_tone.tones.forEach(emote => {
          console.log(emote.tone_id)
          if (emote.tone_id === 'joy') {
            currentMood = currentMood + emote.score * 10
          }
          if (emote.tone_id === 'sadness') {
            currentMood = currentMood - emote.score * 10
          }
          if (emote.tone_id === 'anger') {
            currentMood = currentMood - emote.score * 10
          }
          if (emote.tone_id === 'fear') {
            currentMood = currentMood - emote.score * 10
          }
        })
        if (currentMood <= -30) {
          sendFunny(rtm, message)
          currentMood = 0
        }

        channels.set(message.channel, currentMood)
        console.log('tone endpoint:')
        console.log(JSON.stringify(tone.document_tone.tones, null, 2))
        console.log('current mood:', currentMood)
      }
    }
  )
  console.log(`current mood: ${currentMood}, emotion: $`)
})
