/**
 * 縮圖並上傳場地介紹照片到 Supabase Storage
 * 用法：GYM_ID=<gym_id> SOURCE_DIR=<資料夾路徑> node scripts/upload-facility-photos.js
 *
 * 會把 SOURCE_DIR 底下的 .jpg/.jpeg/.png 縮到 1000px 寬、JPEG 70% 品質，
 * 上傳到 facility-photos bucket 的 <gym_id>/ 路徑下（同名檔案會覆蓋）。
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const GYM_ID = process.env.GYM_ID
const SOURCE_DIR = process.env.SOURCE_DIR
if (!GYM_ID || !SOURCE_DIR) {
  console.error('用法：GYM_ID=<gym_id> SOURCE_DIR=<資料夾路徑> node scripts/upload-facility-photos.js')
  process.exit(1)
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  const files = fs.readdirSync(SOURCE_DIR).filter(f => /\.(jpe?g|png)$/i.test(f))
  if (!files.length) {
    console.error('找不到任何圖片檔案：', SOURCE_DIR)
    process.exit(1)
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'facility-photos-'))
  console.log(`共 ${files.length} 張圖片，開始縮圖並上傳到 facility-photos/${GYM_ID}/ ...\n`)

  for (const file of files) {
    const srcPath = path.join(SOURCE_DIR, file)
    const outName = file.replace(/\.png$/i, '.jpg').replace(/\.jpeg$/i, '.jpg')
    const outPath = path.join(tmpDir, outName)

    execFileSync('sips', ['--resampleWidth', '1000', '-s', 'formatOptions', '70', srcPath, '--out', outPath], { stdio: 'ignore' })

    const buffer = fs.readFileSync(outPath)
    const { error } = await supabase.storage
      .from('facility-photos')
      .upload(`${GYM_ID}/${outName}`, buffer, { contentType: 'image/jpeg', upsert: true })

    if (error) {
      console.error(`✗ ${outName}: ${error.message}`)
    } else {
      console.log(`✓ ${outName}  (${(buffer.length / 1024).toFixed(0)}KB)`)
    }
  }

  fs.rmSync(tmpDir, { recursive: true, force: true })
  console.log('\n完成！')
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
