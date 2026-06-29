import axios from 'axios'

export function welcomeMessage(displayName, gymName, liffUrl) {
  return {
    type: 'flex',
    altText: `歡迎加入 ${gymName}！`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#16a34a',
        contents: [
          {
            type: 'text',
            text: `💪 歡迎加入 ${gymName}`,
            color: '#ffffff',
            weight: 'bold',
            size: 'md',
            wrap: true,
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
            text: `${displayName} 你好！`,
            weight: 'bold',
            size: 'md',
            color: '#1f2937',
          },
          {
            type: 'text',
            text: '請完成帳號綁定，即可使用簽到、查詢堂數等功能。',
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
              label: '立即綁定帳號',
              uri: liffUrl,
            },
          },
        ],
      },
    },
  }
}

const LINE_API = 'https://api.line.me/v2/bot/message/push'

export async function pushMessage(lineUid, messages, token = null) {
  const accessToken = token || process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!lineUid || !accessToken) return

  await axios.post(
    LINE_API,
    { to: lineUid, messages },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )
}

export function checkinSuccessMessage(memberName, remaining, packageName, checkedInAt) {
  const timeStr = new Date(checkedInAt).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return [
    {
      type: 'flex',
      altText: `✅ 簽到成功`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#16a34a',
          contents: [
            {
              type: 'text',
              text: '✅ 簽到成功',
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
              text: `簽到時間：${timeStr}`,
              size: 'sm',
              color: '#6b7280',
              margin: 'sm',
            },
            {
              type: 'text',
              text: `方案：${packageName}`,
              size: 'sm',
              color: '#6b7280',
              margin: 'xs',
            },
            {
              type: 'text',
              text: `剩餘堂數：${remaining} 堂`,
              size: 'sm',
              color: remaining <= 2 ? '#ef4444' : '#6b7280',
              margin: 'xs',
            },
          ],
        },
      },
    },
  ]
}

export function classInviteMessage(memberName, cls, gymName) {
  const dateStr = new Date(cls.start_at).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return {
    type: 'flex',
    altText: `📅 課程邀請：${cls.title}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#16a34a',
        contents: [{ type: 'text', text: '📅 課程邀請', color: '#ffffff', weight: 'bold', size: 'md' }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: `${memberName} 你好！`, weight: 'bold', size: 'md', color: '#1f2937' },
          { type: 'text', text: `課程：${cls.title}`, size: 'sm', color: '#6b7280', margin: 'sm' },
          { type: 'text', text: `時間：${dateStr}`, size: 'sm', color: '#6b7280', margin: 'xs' },
          ...(cls.notes ? [{ type: 'text', text: `備註：${cls.notes}`, size: 'sm', color: '#6b7280', margin: 'xs', wrap: true }] : []),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button', style: 'primary', color: '#16a34a',
            action: { type: 'postback', label: '✅ 確認出席', data: `class_confirm_${cls.id}` },
          },
          {
            type: 'button', style: 'secondary',
            action: { type: 'postback', label: '🏖️ 請假', data: `class_leave_${cls.id}` },
          },
          {
            type: 'button', style: 'secondary',
            action: { type: 'postback', label: '💬 跟教練討論', data: `class_discuss_${cls.id}` },
          },
        ],
      },
    },
  }
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
