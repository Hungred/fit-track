import { Client, validateSignature } from '@line/bot-sdk'
import supabase from '../lib/supabase.js'

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
})

export function verifySignature(req, res, next) {
  const signature = req.headers['x-line-signature']
  const body = JSON.stringify(req.body)

  if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET, signature)) {
    return res.status(403).json({ error: '簽名驗證失敗' })
  }
  next()
}

export async function handleWebhook(req, res) {
  const events = req.body.events || []
  await Promise.all(events.map(handleEvent))
  res.json({ ok: true })
}

async function handleEvent(event) {
  if (event.type === 'follow') {
    await handleFollow(event)
  } else if (event.type === 'message' && event.message.type === 'text') {
    await handleTextMessage(event)
  }
}

async function handleFollow(event) {
  const lineUid = event.source.userId
  const profile = await lineClient.getProfile(lineUid)

  await lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: `歡迎加入 Fit Track！👋\n\n你好 ${profile.displayName}，請點選下方選單完成身份綁定，就可以開始使用簽到功能囉！`,
  })
}

async function handleTextMessage(event) {
  const text = event.message.text.trim()
  const lineUid = event.source.userId

  if (text === '我的資訊' || text === '堂數查詢') {
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('line_uid', lineUid)
      .single()

    if (!member) {
      await lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: '請先完成身份綁定喔！點選選單中的「綁定帳號」。',
      })
      return
    }

    const { data: packages } = await supabase
      .from('member_packages')
      .select('*, package:packages(name)')
      .eq('member_id', member.id)
      .gt('remaining_sessions', 0)

    if (!packages?.length) {
      await lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: `${member.name} 您好！\n\n目前沒有有效堂數，請聯絡教練購課。`,
      })
      return
    }

    const info = packages.map(p =>
      `📦 ${p.package.name}：剩餘 ${p.remaining_sessions} 堂`
    ).join('\n')

    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: `${member.name} 您好！\n\n目前有效方案：\n${info}`,
    })
  }
}
