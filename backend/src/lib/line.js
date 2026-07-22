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
        spacing: 'md',
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
            text: '這裡是你的專屬健身管理帳號，綁定後即可使用：',
            size: 'sm',
            color: '#6b7280',
            wrap: true,
            margin: 'sm',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            margin: 'md',
            contents: [
              { type: 'text', text: '✅  立即簽到', size: 'sm', color: '#374151' },
              { type: 'text', text: '💪  查詢剩餘堂數', size: 'sm', color: '#374151', margin: 'xs' },
              { type: 'text', text: '📋  查看出勤記錄', size: 'sm', color: '#374151', margin: 'xs' },
              { type: 'text', text: '📅  查看課程安排', size: 'sm', color: '#374151', margin: 'xs' },
            ],
          },
          {
            type: 'text',
            text: '請點下方按鈕完成綁定，開始使用 👇',
            size: 'sm',
            color: '#6b7280',
            wrap: true,
            margin: 'md',
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

export function classStatusReplyMessage(action, cls) {
  const headerMap = {
    confirm: { text: '✅ 已確認出席', color: '#16a34a' },
    leave:   { text: '🏖️ 已登記請假', color: '#ea580c' },
    discuss: { text: '💬 已通知教練', color: '#2563eb' },
  }
  const header = headerMap[action]

  const dateStr = new Date(cls.start_at).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  const allButtons = [
    { label: '✅ 確認出席',   data: `class_confirm_${cls.id}` },
    { label: '🏖️ 請假',      data: `class_leave_${cls.id}` },
    { label: '💬 跟教練討論', data: `class_discuss_${cls.id}` },
  ]
  const changeButtons = allButtons.filter(b => !b.data.includes(`_${action}_`))

  return {
    type: 'flex',
    altText: header.text,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: header.color,
        contents: [{ type: 'text', text: header.text, color: '#ffffff', weight: 'bold', size: 'md' }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
          { type: 'text', text: `課程：${cls.title || '上課'}`, size: 'sm', color: '#374151' },
          { type: 'text', text: `時間：${dateStr}`, size: 'sm', color: '#374151', margin: 'xs' },
          ...(cls.coach?.name ? [{ type: 'text', text: `教練：${cls.coach.name}`, size: 'sm', color: '#374151', margin: 'xs' }] : []),
          { type: 'text', text: '想更改出席狀態？', size: 'xs', color: '#9ca3af', margin: 'lg' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: changeButtons.map(b => ({
          type: 'button',
          style: 'secondary',
          height: 'sm',
          action: { type: 'postback', label: b.label, data: b.data },
        })),
      },
    },
  }
}

export function classReminderMessage(memberName, cls) {
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
    altText: `⏰ 課程提醒：1 小時後開始`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#2563eb',
        contents: [{ type: 'text', text: '⏰ 課程提醒', color: '#ffffff', weight: 'bold', size: 'md' }],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          { type: 'text', text: `${memberName} 你好`, weight: 'bold', size: 'md', color: '#1f2937' },
          {
            type: 'text',
            text: '你的課程將於 1 小時後開始，請準時到場！',
            size: 'sm', color: '#6b7280', wrap: true, margin: 'sm',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'xs',
            contents: [
              { type: 'text', text: `📅 ${cls.title || '上課'}`, size: 'sm', color: '#374151' },
              { type: 'text', text: `🕐 ${dateStr}`, size: 'sm', color: '#374151', margin: 'xs' },
              ...(cls.coach?.name
                ? [{ type: 'text', text: `👤 教練：${cls.coach.name}`, size: 'sm', color: '#374151', margin: 'xs' }]
                : []),
            ],
          },
        ],
      },
    },
  }
}

export function spaceBookingReceivedMessage(renterName, booking, spaceName) {
  const dateStr = new Date(booking.start_at).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
  })
  const endStr = new Date(booking.end_at).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit',
  })
  return {
    type: 'flex',
    altText: '🏢 場地預約已收到',
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#7c3aed',
        contents: [{ type: 'text', text: '🏢 場地預約已收到', color: '#ffffff', weight: 'bold', size: 'md' }],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          { type: 'text', text: `${renterName} 你好`, weight: 'bold', size: 'md', color: '#1f2937' },
          { type: 'text', text: '你的場地預約已收到，我們將盡快確認！', size: 'sm', color: '#6b7280', wrap: true, margin: 'sm' },
          {
            type: 'box', layout: 'vertical', margin: 'lg', spacing: 'xs',
            contents: [
              { type: 'text', text: `📍 ${spaceName}`, size: 'sm', color: '#374151' },
              { type: 'text', text: `🕐 ${dateStr} – ${endStr}`, size: 'sm', color: '#374151', margin: 'xs' },
              { type: 'text', text: `💰 NT$${booking.total_price}`, size: 'sm', color: '#374151', margin: 'xs' },
            ],
          },
        ],
      },
    },
  }
}

export function spaceBookingConfirmedMessage(renterName, booking, spaceName) {
  const dateStr = new Date(booking.start_at).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit',
  })
  const endStr = new Date(booking.end_at).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit',
  })
  return {
    type: 'flex',
    altText: '✅ 場地預約已確認',
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#16a34a',
        contents: [{ type: 'text', text: '✅ 場地預約已確認', color: '#ffffff', weight: 'bold', size: 'md' }],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          { type: 'text', text: `${renterName} 你好`, weight: 'bold', size: 'md', color: '#1f2937' },
          { type: 'text', text: '你的場地預約已確認，記得準時到場！', size: 'sm', color: '#6b7280', wrap: true, margin: 'sm' },
          {
            type: 'box', layout: 'vertical', margin: 'lg', spacing: 'xs',
            contents: [
              { type: 'text', text: `📍 ${spaceName}`, size: 'sm', color: '#374151' },
              { type: 'text', text: `🕐 ${dateStr} – ${endStr}`, size: 'sm', color: '#374151', margin: 'xs' },
              { type: 'text', text: `💰 NT$${booking.total_price}`, size: 'sm', color: '#374151', margin: 'xs' },
            ],
          },
        ],
      },
    },
  }
}

export function spaceRentalInfoMessage(gym, liffUrl) {
  const rules = gym.space_rental_rules || '請聯繫我們了解場地租借詳情。'
  const footerButtons = []

  if (gym.space_rental_pdf_url) {
    footerButtons.push({
      type: 'button', style: 'secondary',
      action: { type: 'uri', label: '📄 查看規則 PDF', uri: gym.space_rental_pdf_url },
    })
  }

  footerButtons.push({
    type: 'button', style: 'primary', color: '#7c3aed',
    action: { type: 'uri', label: '📅 立即預約', uri: liffUrl },
  })

  return {
    type: 'flex',
    altText: '🏢 場地租借規則',
    contents: {
      type: 'bubble',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#7c3aed',
        contents: [{ type: 'text', text: '🏢 場地租借規則', color: '#ffffff', weight: 'bold', size: 'md' }],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: [
          { type: 'text', text: rules, size: 'sm', color: '#374151', wrap: true },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm',
        contents: footerButtons,
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
