import { PDFDocument } from 'pdf-lib'
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'

export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const fetcher = globalThis.fetch ? globalThis.fetch.bind(globalThis) : fetch

const resolveImageUrl = (src, baseUrl) => {
  if (!src) return null
  if (src.startsWith('//')) {
    return `https:${src}`
  }

  try {
    return new URL(src, baseUrl).toString()
  } catch {
    return null
  }
}

const pickImageSource = (element) => {
  const attributes = ['data-src', 'data-lazy-src', 'data-original', 'src']
  for (const attribute of attributes) {
    const value = element.attr(attribute)
    if (value && value.trim() && !value.startsWith('data:image')) {
      return value.trim()
    }
  }
  return null
}

const downloadImage = async (url, referer) => {
  const response = await fetcher(url, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Referer: referer,
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status}): ${url}`)
  }

  const contentType = response.headers.get('content-type') || ''
  const arrayBuffer = await response.arrayBuffer()
  return { bytes: new Uint8Array(arrayBuffer), contentType }
}

const isJpeg = (contentType, url) =>
  contentType.includes('jpeg') ||
  contentType.includes('jpg') ||
  /\.(jpe?g)(\?|$)/i.test(url)

const isPng = (contentType, url) =>
  contentType.includes('png') || /\.png(\?|$)/i.test(url)

export const deriveOutputName = (urlString) => {
  try {
    const urlObject = new URL(urlString)
    const lastSegment = urlObject.pathname.split('/').filter(Boolean).pop() || 'chapter'
    return `${lastSegment}.pdf`
  } catch {
    return 'chapter.pdf'
  }
}

export const fetchChapterImages = async (inputUrl) => {
  const url = new URL(inputUrl)
  const response = await fetcher(url.toString(), {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: 'text/html',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch page (${response.status}): ${url.toString()}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)
  const readingContent = $('.reading-content')

  if (readingContent.length === 0) {
    throw new Error('Could not find .reading-content on the page.')
  }

  const imageUrls = []
  readingContent.find('.page-break.no-gaps img').each((_, element) => {
    const img = $(element)
    const rawSrc = pickImageSource(img)
    const resolved = resolveImageUrl(rawSrc, url.toString())
    if (resolved) {
      imageUrls.push(resolved)
    }
  })

  if (imageUrls.length === 0) {
    throw new Error('No images found inside .reading-content .page-break.no-gaps')
  }

  return { imageUrls, sourceUrl: url.toString() }
}

export const buildPdfBuffer = async (imageUrls, referer, onProgress) => {
  const pdfDoc = await PDFDocument.create()

  for (let index = 0; index < imageUrls.length; index += 1) {
    const imageUrl = imageUrls[index]
    onProgress?.(index + 1, imageUrls.length)

    const { bytes, contentType } = await downloadImage(imageUrl, referer)
    let embeddedImage

    if (isJpeg(contentType, imageUrl)) {
      embeddedImage = await pdfDoc.embedJpg(bytes)
    } else if (isPng(contentType, imageUrl)) {
      embeddedImage = await pdfDoc.embedPng(bytes)
    } else {
      throw new Error(
        `Unsupported image type (${contentType || 'unknown'}). Expected JPG/PNG. URL: ${imageUrl}`
      )
    }

    const { width, height } = embeddedImage.scale(1)
    const page = pdfDoc.addPage([width, height])
    page.drawImage(embeddedImage, { x: 0, y: 0, width, height })
  }

  return pdfDoc.save()
}
