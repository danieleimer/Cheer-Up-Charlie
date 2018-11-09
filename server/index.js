const path = require('path')
const express = require('express')
const morgan = require('morgan')
const compression = require('compression')
const session = require('express-session')
const passport = require('passport')
const SequelizeStore = require('connect-session-sequelize')(session.Store)
const db = require('./db')
const sessionStore = new SequelizeStore({db})
const PORT = process.env.PORT || 8080
const app = express()
const socketio = require('socket.io')
const {RTMClient, WebClient} = require('@slack/client')
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3')
const axios = require('axios')
module.exports = app

// This is a global Mocha hook, used for resource cleanup.
// Otherwise, Mocha v4+ never quits after tests.
if (process.env.NODE_ENV === 'test') {
  after('close the session store', () => sessionStore.stopExpiringSessions())
}

/**
 * In your development environment, you can keep all of your
 * app's secret API keys in a file called `secrets.js`, in your project
 * root. This file is included in the .gitignore - it will NOT be tracked
 * or show up on Github. On your production server, you can add these
 * keys as environment variables, so that they can still be read by the
 * Node process on process.env
 */
if (process.env.NODE_ENV !== 'production') require('../secrets')

// passport registration
passport.serializeUser((user, done) => done(null, user.id))

passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.models.user.findById(id)
    done(null, user)
  } catch (err) {
    done(err)
  }
})

const createApp = () => {
  const channels = {}

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
    iam_apikey: process.env.WATSON_API_KEY,
    version: '2017-09-21',
    url: 'https://gateway.watsonplatform.net/tone-analyzer/api/'
  })

  const token = process.env.SLACK_BOT_TOKEN
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

    if (!channels[message.channel]) {
      channels[message.channel] = 0
    }
    let currentMood = channels[message.channel]
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

          channels[message.channel] = currentMood
          console.log('tone endpoint:')
          console.log(JSON.stringify(tone.document_tone.tones, null, 2))
          console.log('current mood:', currentMood)
        }
      }
    )
    console.log(`current mood: ${currentMood}, emotion: $`)
  })

  app.get('/channels', (req, res, next) => {
    console.log(channels)
    res.json(channels)
  })

  // logging middleware
  app.use(morgan('dev'))

  // body parsing middleware
  app.use(express.json())
  app.use(express.urlencoded({extended: true}))

  // compression middleware
  app.use(compression())

  // session middleware with passport
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'my best friend is Cody',
      store: sessionStore,
      resave: false,
      saveUninitialized: false
    })
  )
  app.use(passport.initialize())
  app.use(passport.session())

  // auth and api routes
  app.use('/auth', require('./auth'))
  app.use('/api', require('./api'))

  // static file-serving middleware
  app.use(express.static(path.join(__dirname, '..', 'public')))

  // any remaining requests with an extension (.js, .css, etc.) send 404
  app.use((req, res, next) => {
    if (path.extname(req.path).length) {
      const err = new Error('Not found')
      err.status = 404
      next(err)
    } else {
      next()
    }
  })

  // sends index.html
  app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/index.html'))
  })

  // error handling endware
  app.use((err, req, res, next) => {
    console.error(err)
    console.error(err.stack)
    res.status(err.status || 500).send(err.message || 'Internal server error.')
  })
}

const startListening = () => {
  // start listening (and create a 'server' object representing our server)
  const server = app.listen(PORT, () =>
    console.log(`Mixing it up on port ${PORT}`)
  )

  // set up our socket control center
  const io = socketio(server)
  require('./socket')(io)
}

const syncDb = () => db.sync()

async function bootApp() {
  await sessionStore.sync()
  await syncDb()
  await createApp()
  await startListening()
}
// This evaluates as true when this file is run directly from the command line,
// i.e. when we say 'node server/index.js' (or 'nodemon server/index.js', or 'nodemon server', etc)
// It will evaluate false when this module is required by another module - for example,
// if we wanted to require our app in a test spec
if (require.main === module) {
  bootApp()
} else {
  createApp()
}
