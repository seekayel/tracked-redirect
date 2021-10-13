const express = require('express')
const Analytics = require('analytics-node')
const { stringify } = require('qs')
const cookieParser = require('cookie-parser')
const uuid = require('uuid');

const analytics = new Analytics(process.env.SEGMENT_WRITE_KEY)


const app = express()
app.use(cookieParser())

app.use((req, res, next) => {
  const { query, cookies, url, path, ip, hostname } = req

  // populate campaign object with any utm params
  const campaign = {}
  if (query.utm_content) campaign.content = query.utm_content
  if (query.utm_campaign) campaign.name = query.utm_campaign
  if (query.utm_medium) campaign.medium = query.utm_medium
  if (query.utm_source) campaign.source = query.utm_source
  if (query.utm_term) campaign.keyword = query.utm_term

  // grab userId if present
  let userId = null
  if (cookies.ajs_user_id) userId = cookies.ajs_user_id

  // if no anonymousId, send a randomly generated one
  // otherwise grab existing to include in call to segment
  let anonymousId
  if (cookies.ajs_anonymous_id) {
    anonymousId = cookies.ajs_anonymous_id
  } else {
    anonymousId = uuid.v4()
    res.cookie('ajs_anonymous_id', anonymousId, {domain: ".cyclic.sh"})
  }

  const referrer = req.get('Referrer')
  const userAgent = req.get('User-Agent')

  const properties = {
    query: stringify(query),
    referrer,
    path,
    host: hostname,
    url,
    offer: 'Free t-shirt',
    source: 'CMU Shark Tank'
    /* ++ any custom props (eg. title) */
  }

  const context = {
    campaign,
    userAgent,
    ip
  }

  // send a call to segment
  analytics.track({
    event: 'Offer Clicked',
    anonymousId, // either random (matching cookie) or from client
    userId, // might be null
    properties,
    context
  })

  // proceed!
  next()
})

app.all('*', (req,res) => {
  res.redirect('https://app.cyclic.sh/api/login')
})

app.listen(process.env.PORT || 3000, () => {
  console.log('listening for requests')
})
