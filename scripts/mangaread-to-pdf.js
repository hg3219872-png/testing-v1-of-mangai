import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { buildPdfBuffer, deriveOutputName, fetchChapterImages } from './mangaread-core.js'

const args = process.argv.slice(2)

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(
    [
      'Usage:',
      '  node scripts/mangaread-to-pdf.js "<chapter-url>" --out "<output.pdf>"',
      '',
      'Example:',
      '  node scripts/mangaread-to-pdf.js "https://www.mangaread.org/manga/..." --out "chapter-10.pdf"',
    ].join('\n')
  )
  process.exit(0)
}

const inputUrl = args[0]
const outputFlagIndex = args.indexOf('--out')
const outputArg = outputFlagIndex >= 0 ? args[outputFlagIndex + 1] : null

const normalizeOutputPath = (url, output) => {
  if (output) {
    return output.toLowerCase().endsWith('.pdf') ? output : `${output}.pdf`
  }

  return deriveOutputName(url)
}

const outputPath = normalizeOutputPath(inputUrl, outputArg)

const main = async () => {
  let url
  try {
    url = new URL(inputUrl)
  } catch {
    throw new Error(`Invalid URL: ${inputUrl}`)
  }

  const outputDir = path.dirname(outputPath)
  if (outputDir && outputDir !== '.') {
    await fs.mkdir(outputDir, { recursive: true })
  }

  console.log('🔎 Fetching page...')
  const { imageUrls, sourceUrl } = await fetchChapterImages(url.toString())
  console.log(`🧾 Found ${imageUrls.length} pages. Building PDF...`)

  const pdfBytes = await buildPdfBuffer(imageUrls, sourceUrl, (current, total) => {
    console.log(`⬇️  Downloading ${current}/${total}`)
  })

  await fs.writeFile(outputPath, pdfBytes)
  console.log(`✅ PDF saved: ${outputPath}`)
}

main().catch((error) => {
  console.error('❌', error.message || error)
  process.exit(1)
})
