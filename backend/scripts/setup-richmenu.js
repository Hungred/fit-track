/**
 * 設定新版 5 格非對稱圖文選單
 * 用法：GYM_ID=<gym_id> node scripts/setup-richmenu.js
 *
 * 版型：
 *   ① 場地租借   ② 不定期團課  ⑤ 場地介紹（全高，暫停用）
 *   ③ 體驗課     ④ 私人課程    ⑤
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import os from 'os'
import path from 'path'

const GYM_ID = process.env.GYM_ID
if (!GYM_ID) {
  console.error('請提供 GYM_ID，用法：GYM_ID=<id> node scripts/setup-richmenu.js')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PNG_PATH = path.join(os.homedir(), 'Desktop', 'fit_track_richmenu_new.png')
const COMING_SOON = '功能即將開放，敬請期待 🙏'

async function lineApi(token, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`LINE API 錯誤 [${res.status}] ${url}\n${body}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : {}
}

async function main() {
  // 1. 取得健身房 LINE 憑證
  const { data: gym, error } = await supabase
    .from('gyms')
    .select('name, line_channel_access_token, liff_id')
    .eq('id', GYM_ID)
    .single()

  if (error || !gym) {
    console.error('找不到健身房:', error?.message ?? '無資料')
    process.exit(1)
  }

  const { name, line_channel_access_token: token, liff_id: liffId } = gym
  if (!token) { console.error('該健身房尚未設定 line_channel_access_token'); process.exit(1) }
  if (!liffId) { console.error('該健身房尚未設定 liff_id'); process.exit(1) }

  const LIFF = `https://liff.line.me/${liffId}`
  console.log(`\n健身房：${name}  (gym_id: ${GYM_ID})`)
  console.log(`LIFF：${LIFF}\n`)

  // 2. 定義圖文選單
  const richMenu = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: 'Fit Track v2',
    chatBarText: '功能選單',
    areas: [
      // ① 場地租借（左上）
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: 'uri', uri: `${LIFF}/space-booking?gym=${GYM_ID}` },
      },
      // ② 不定期團課（中上）
      {
        bounds: { x: 833, y: 0, width: 833, height: 843 },
        action: { type: 'uri', uri: `${LIFF}/group-classes?gym=${GYM_ID}` },
      },
      // ③ 體驗課（左下）暫停用
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: 'message', text: COMING_SOON },
      },
      // ④ 私人課程（中下）暫停用
      {
        bounds: { x: 833, y: 843, width: 833, height: 843 },
        action: { type: 'message', text: COMING_SOON },
      },
      // ⑤ 場地介紹（右側全高）暫停用
      {
        bounds: { x: 1666, y: 0, width: 834, height: 1686 },
        action: { type: 'message', text: COMING_SOON },
      },
    ],
  }

  // 3. 建立圖文選單
  process.stdout.write('建立圖文選單... ')
  const { richMenuId } = await lineApi(token, 'https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(richMenu),
  })
  console.log(`✓  ${richMenuId}`)

  // 4. 上傳圖片
  if (!fs.existsSync(PNG_PATH)) {
    console.error(`找不到圖片：${PNG_PATH}`)
    process.exit(1)
  }
  process.stdout.write('上傳圖片... ')
  await lineApi(token, `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/png' },
    body: fs.readFileSync(PNG_PATH),
  })
  console.log('✓')

  // 5. 設為預設圖文選單
  process.stdout.write('設定為預設選單... ')
  await lineApi(token, `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: 'POST',
  })
  console.log('✓')

  console.log(`\n✅  完成！${name} 的圖文選單已更新。`)
  console.log(`   richMenuId: ${richMenuId}`)
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
