import express from 'express'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

// Serve built frontend in production
app.use(express.static(join(__dirname, '../dist')))
// Serve public assets (images, etc.) from both dev and prod
app.use(express.static(join(__dirname, '../public')))

app.get('/api/questions', (_req, res) => {
  try {
    const raw = readFileSync(join(__dirname, '../data/questions.json'), 'utf-8')
    res.json(JSON.parse(raw))
  } catch (err) {
    res.status(500).json({ error: 'Không thể tải dữ liệu câu hỏi.' })
  }
})

// SPA fallback — only serves dist/index.html in production
app.get('*', (req, res) => {
  const indexPath = join(__dirname, '../dist/index.html')
  try {
    res.sendFile(indexPath)
  } catch {
    res.status(404).send('Chưa build frontend. Chạy: npm run build')
  }
})

app.listen(PORT, () => {
  console.log(`✅ Backend chạy tại http://localhost:${PORT}`)
  console.log(`   API: http://localhost:${PORT}/api/questions`)
})
