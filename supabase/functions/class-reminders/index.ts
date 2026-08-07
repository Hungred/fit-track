import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, serviceRoleKey)

function classReminderMessage(memberName: string, cls: Record<string, any>) {
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
    altText: '⏰ 課程提醒：1 小時後開始',
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

Deno.serve(async (req) => {
  // 驗證 Authorization header，防止公開呼叫
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const now = new Date()
  const windowStart = new Date(now.getTime() + 50 * 60 * 1000).toISOString()
  const windowEnd   = new Date(now.getTime() + 70 * 60 * 1000).toISOString()

  const { data: classes, error: classErr } = await supabase
    .from('classes')
    .select('id, title, start_at, coach:coach_id(name), gym:gym_id(line_channel_access_token)')
    .gte('start_at', windowStart)
    .lte('start_at', windowEnd)

  if (classErr) {
    return new Response(JSON.stringify({ error: classErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!classes?.length) {
    return new Response(JSON.stringify({ sent: 0, message: 'no upcoming classes' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const classIds = classes.map((c: any) => c.id)
  const classMap = Object.fromEntries(classes.map((c: any) => [c.id, c]))

  const { data: enrollments, error: enErr } = await supabase
    .from('class_enrollments')
    .select('id, class_id, member:member_id(name, line_uid)')
    .in('class_id', classIds)
    .eq('status', 'confirmed')
    .is('reminded_at', null)

  if (enErr) {
    return new Response(JSON.stringify({ error: enErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!enrollments?.length) {
    return new Response(JSON.stringify({ sent: 0, message: 'no pending reminders' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  const remindedAt = now.toISOString()

  for (const enrollment of enrollments as any[]) {
    const cls = classMap[enrollment.class_id]
    const member = enrollment.member
    if (!member?.line_uid || !cls?.gym?.line_channel_access_token) continue

    try {
      const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cls.gym.line_channel_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: member.line_uid,
          messages: [classReminderMessage(member.name, cls)],
        }),
      })

      if (!lineRes.ok) {
        const body = await lineRes.text()
        console.error(`LINE push failed for ${member.name}: ${body}`)
        continue
      }

      await supabase
        .from('class_enrollments')
        .update({ reminded_at: remindedAt })
        .eq('id', enrollment.id)

      console.log(`[提醒] ${member.name}｜${cls.title || '上課'}｜${new Date(cls.start_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`)
      sent++
    } catch (err) {
      console.error(`Reminder failed for ${member.name}:`, err)
    }
  }

  return new Response(JSON.stringify({ sent, total: enrollments.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
