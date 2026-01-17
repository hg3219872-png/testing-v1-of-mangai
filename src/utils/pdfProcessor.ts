import * as pdfjsLib from 'pdfjs-dist'
import { PageData } from '../types'

// Configure PDF.js worker - use local file first, then CDN fallbacks
if (typeof window !== 'undefined') {
  const pdfVersion = '4.0.379'
  
  // Try local worker first (served from public directory), then CDN fallbacks
  // Note: PDF.js 4.x uses .mjs files (ES modules)
  const localWorker = '/pdf.worker.min.mjs'
  const cdnWorkers = [
    `https://unpkg.com/pdfjs-dist@${pdfVersion}/build/pdf.worker.min.mjs`,
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfVersion}/build/pdf.worker.min.mjs`,
  ]
  
  // Use local worker file (served from public directory by Vite)
  pdfjsLib.GlobalWorkerOptions.workerSrc = localWorker
  console.log('📦 PDF.js worker configured (local):', pdfjsLib.GlobalWorkerOptions.workerSrc)
  console.log('📦 PDF.js version:', pdfjsLib.version)
  console.log('📦 CDN fallbacks available:', cdnWorkers)
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
// Use a fixed scale factor to preserve original aspect ratio
// This ensures the PDF is rendered at high quality without forcing any width
const RENDER_SCALE = 2.0 // 2x scale for good quality while preserving aspect ratio

export function validatePDF(file: File): { valid: boolean; error?: string } {
  console.log('Validating file:', { 
    name: file.name, 
    type: file.type, 
    size: file.size,
    lastModified: file.lastModified
  })
  
  // Check if file exists
  if (!file || file.size === undefined) {
    console.error('Invalid file object')
    return { valid: false, error: 'Invalid file object' }
  }
  
  // Check file extension as fallback (some browsers don't set MIME type correctly)
  const fileName = file.name.toLowerCase().trim()
  const isPDFExtension = fileName.endsWith('.pdf')
  const isPDFMimeType = file.type === 'application/pdf' || file.type === '' || file.type === 'application/octet-stream'
  
  console.log('File type check:', { isPDFExtension, isPDFMimeType, fileName, mimeType: file.type })
  
  if (!isPDFExtension && !isPDFMimeType) {
    console.log('File validation failed - not a PDF:', { 
      name: file.name, 
      type: file.type, 
      size: file.size 
    })
    return { valid: false, error: `Please upload a PDF file (.pdf). Detected type: ${file.type || 'unknown'}` }
  }
  
  if (file.size === 0) {
    return { valid: false, error: 'File is empty' }
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 50MB limit` }
  }
  
  console.log('✅ File validated successfully:', { 
    name: file.name, 
    type: file.type, 
    size: `${(file.size / 1024 / 1024).toFixed(2)}MB` 
  })
  return { valid: true }
}

export async function convertPDFToImages(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<PageData[]> {
  console.log('🔄 Converting PDF to images, file size:', file.size)
  try {
    console.log('📦 Creating ArrayBuffer...')
    const arrayBuffer = await file.arrayBuffer()
    console.log('✅ ArrayBuffer created, size:', arrayBuffer.byteLength)
    
    console.log('📄 Loading PDF document with PDF.js...')
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      verbosity: 0 // Reduce console noise
    })
    
    const pdf = await loadingTask.promise
    console.log('✅ PDF loaded successfully! Number of pages:', pdf.numPages)
    
    if (pdf.numPages === 0) {
      throw new Error('PDF has no pages')
    }
    
    const pages: PageData[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`📄 Processing page ${i}/${pdf.numPages}...`)
      
      try {
        const page = await pdf.getPage(i)
        
        // Get the original viewport at scale 1.0 to see natural dimensions
        const originalViewport = page.getViewport({ scale: 1.0 })
        const originalAspectRatio = originalViewport.width / originalViewport.height
        
        // Use a fixed scale factor - this preserves the original aspect ratio perfectly
        // No width forcing, no stretching - just scale up for quality
        const scaledViewport = page.getViewport({ scale: RENDER_SCALE })

        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        
        if (!context) {
          throw new Error('Could not get canvas context')
        }
        
        // Set canvas dimensions to exactly match the scaled viewport
        // This preserves the original PDF aspect ratio perfectly
        canvas.width = Math.round(scaledViewport.width)
        canvas.height = Math.round(scaledViewport.height)
        
        // Verify aspect ratio is preserved
        const renderedAspectRatio = canvas.width / canvas.height
        const aspectRatioMatch = Math.abs(renderedAspectRatio - originalAspectRatio) < 0.01
        
        console.log(`📐 Page ${i} original: ${originalViewport.width.toFixed(0)}x${originalViewport.height.toFixed(0)} (AR: ${originalAspectRatio.toFixed(3)})`)
        console.log(`📐 Page ${i} rendered: ${canvas.width}x${canvas.height} (AR: ${renderedAspectRatio.toFixed(3)}) ${aspectRatioMatch ? '✅' : '❌'}`)

        console.log(`🎨 Rendering page ${i} (${canvas.width}x${canvas.height})...`)
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise

        const imageUrl = canvas.toDataURL('image/png')
        console.log(`✅ Page ${i} rendered successfully`)

        pages.push({
          pageIndex: i - 1,
          imageUrl,
          width: canvas.width,
          height: canvas.height,
          panels: [],
          sequencedPanels: [],
        })
        
        // Update progress
        if (onProgress) {
          onProgress(i, pdf.numPages)
        }
      } catch (pageError) {
        console.error(`❌ Error processing page ${i}:`, pageError)
        throw new Error(`Failed to process page ${i}: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`)
      }
    }

    console.log('✅ All pages converted successfully! Total:', pages.length)
    return pages
  } catch (error) {
    console.error('❌ Error in convertPDFToImages:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Full error details:', error)
    throw new Error(`Failed to process PDF: ${errorMessage}`)
  }
}
