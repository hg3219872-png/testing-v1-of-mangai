import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import { buildPdfBuffer, deriveOutputName, fetchChapterImages } from '../scripts/mangaread-core.js'

const app = express()
const PORT = process.env.PORT || 5175

app.use(express.json({ limit: '1mb' }))

const distPath = path.resolve(process.cwd(), 'dist')
const hasDist = fs.existsSync(distPath)

if (hasDist) {
  app.use(express.static(distPath))
}

const voiceCache = {
  map: new Map(),
  updatedAt: 0,
}

const resolveVoiceId = async ({ apiKey, voiceId, voiceName }) => {
  if (typeof voiceId === 'string' && voiceId.trim()) {
    return voiceId.trim()
  }

  if (typeof voiceName === 'string' && voiceName.trim()) {
    const name = voiceName.trim()
    const cached = voiceCache.map.get(name)
    if (cached) return cached

    const now = Date.now()
    const isStale = now - voiceCache.updatedAt > 10 * 60 * 1000
    if (isStale) {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': apiKey },
      })
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data?.voices)) {
          voiceCache.map.clear()
          data.voices.forEach((voice) => {
            if (voice?.name && voice?.voice_id) {
              voiceCache.map.set(voice.name, voice.voice_id)
            }
          })
          voiceCache.updatedAt = now
        }
      }
    }

    const resolved = voiceCache.map.get(name)
    if (resolved) return resolved
  }

  return process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'
}

const loadLocalEnv = () => {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const contents = fs.readFileSync(envPath, 'utf-8')
  contents.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) return
    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"|"$/g, '')
    if (!key || key in process.env) return
    process.env[key] = value
  })
}

loadLocalEnv()

app.post('/api/mangaread', async (req, res) => {
  try {
    const { url } = req.body || {}
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing URL' })
    }

    let parsedUrl
    try {
      parsedUrl = new URL(url)
    } catch {
      return res.status(400).json({ error: 'Invalid URL' })
    }

    if (parsedUrl.hostname !== 'www.mangaread.org' && parsedUrl.hostname !== 'mangaread.org') {
      return res.status(400).json({ error: 'Only mangaread.org links are supported' })
    }

    const { imageUrls, sourceUrl } = await fetchChapterImages(parsedUrl.toString())
    const pdfBytes = await buildPdfBuffer(imageUrls, sourceUrl)
    const filename = deriveOutputName(sourceUrl)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(Buffer.from(pdfBytes))
  } catch (error) {
    console.error('Failed to generate PDF:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    })
  }
})

app.post('/api/tts/elevenlabs', async (req, res) => {
  try {
    const { text, voiceId, voiceName, voiceSettings } = req.body || {}
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing text' })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing ELEVENLABS_API_KEY' })
    }

    const selectedVoiceId = await resolveVoiceId({ apiKey, voiceId, voiceName })

    const safeVoiceSettings = {
      stability: 0.4,
      similarity_boost: 0.8,
    }
    if (voiceSettings && typeof voiceSettings === 'object') {
      const stability = Number(voiceSettings.stability)
      const similarity = Number(voiceSettings.similarity_boost)
      if (!Number.isNaN(stability)) {
        safeVoiceSettings.stability = Math.min(1, Math.max(0, stability))
      }
      if (!Number.isNaN(similarity)) {
        safeVoiceSettings.similarity_boost = Math.min(1, Math.max(0, similarity))
      }
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: safeVoiceSettings,
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(response.status).json({ error: errorText })
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    res.send(audioBuffer)
  } catch (error) {
    console.error('Failed to generate TTS audio:', error)
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate TTS audio',
    })
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

if (hasDist) {
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`Manga PDF server listening on http://localhost:${PORT}`)
})
