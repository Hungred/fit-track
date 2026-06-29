import { Client, validateSignature } from '@line/bot-sdk'
import supabase from '../lib/supabase.js'
import { welcomeMessage } from '../lib/line.js'

export async function handleWebhook(req, res) {
  const { gymId } = req.params

  const { data: gym } = await supabase
    .from('gyms')
    .select('*')
    .eq('id', gymId)
    .eq('status', 'active')
    .single()

  if (!gym) return res.status(404).json({ error: '找不到此健身房' })

  const signature = req.headers['x-line-signature']
  if (!validateSignature(JSON.stringify(req.body), gym.line_channel_secret, signature)) {
    return res.status(403).json({ error: '簽名驗證失敗' })
  }

  const client = new Client({ channelAccessToken: gym.line_channel_access_token })
  const events = req.body.events || []

  await Promise.all(events.map(event => handleEvent(event, client, gym)))
  res.json({ ok: true })
}

async function handleEvent(event, client, gym) {
  if (event.type === 'follow') {
    await handleFollow(event, client, gym)
  } else if (event.type === 'message' && event.message.type === 'text') {
    await handleTextMessage(event, client, gym)
  }
}

async function handleFollow(event, client, gym) {
  const lineUid = event.source.userId
  const profile = await client.getProfile(lineUid)

  const liffUrl = gym.liff_id
    ? `https://liff.line.me/${gym.liff_id}?gym=${gym.id}`
    : `${process.env.FRONTEND_URL}?gym=${gym.id}`

  await client.replyMessage(event.replyToken, welcomeMessage(profile.displayName, gym.name, liffUrl))
}

async function handleTextMessage(event, client, gym) {
  const text = event.message.text.trim()
  const lineUid = event.source.userId

  if (text === '我的資訊' || text === '堂數查詢') {
    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('line_uid', lineUid)
      .eq('gym_id', gym.id)
      .single()

    if (!member) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '請先完成身份綁定喔！點選選單中的「綁定帳號」。',
      })
      return
    }

    const { data: packages } = await supabase
      .from('member_packages')
      .select('*, package:packages(name)')
      .eq('member_id', member.id)
      .eq('gym_id', gym.id)
      .gt('remaining_sessions', 0)

    if (!packages?.length) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `${member.name} 您好！\n\n目前沒有有效堂數，請聯絡教練購課。`,
      })
      return
    }

    const info = packages.map(p =>
      `📦 ${p.package.name}：剩餘 ${p.remaining_sessions} 堂`
    ).join('\n')

    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `${member.name} 您好！\n\n目前有效方案：\n${info}`,
    })
  }
}
