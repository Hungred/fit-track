import axios from 'axios'

const LINE_API = 'https://api.line.me/v2/bot/message/push'

export async function pushMessage(lineUid, messages) {
  if (!lineUid || !process.env.LINE_CHANNEL_ACCESS_TOKEN) return

  await axios.post(
    LINE_API,
    { to: lineUid, messages },
    {
      headers: {
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  )
}

export function lowSessionMessage(memberName, remaining, packageName) {
  return [
    {
      type: 'flex',
      altText: `⚠️ 堂數不足提醒`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#16a34a',
          contents: [
            {
              type: 'text',
              text: '⚠️ 堂數即將用完',
              color: '#ffffff',
              weight: 'bold',
              size: 'md',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'text',
              text: `${memberName} 您好`,
              weight: 'bold',
              size: 'md',
              color: '#1f2937',
            },
            {
              type: 'text',
              text: `方案「${packageName}」剩餘 ${remaining} 堂`,
              size: 'sm',
              color: '#6b7280',
              margin: 'sm',
            },
            {
              type: 'text',
              text: '請儘早聯繫教練續購課程，以免影響上課權益。',
              size: 'sm',
              color: '#6b7280',
              wrap: true,
              margin: 'sm',
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#16a34a',
              action: {
                type: 'uri',
                label: '查看我的堂數',
                uri: process.env.LIFF_URL || 'https://fit-track-liff.vercel.app',
              },
            },
          ],
        },
      },
    },
  ]
}
