import { useState, useEffect, useRef } from 'react'
import { createWorker } from 'tesseract.js'
import ProcessingIndicator from './components/ProcessingIndicator'
import PanelViewer from './components/PanelViewer'
import PDFUpload from './components/PDFUpload'
import { convertPDFToImages } from './utils/pdfProcessor'
import { detectPanels } from './utils/panelDetection'
import { sequencePanels } from './utils/panelSequencing'
import { createFramedPanel } from './utils/autoFraming'
import { PageData, ProcessingProgress, FramedPanel } from './types'

type AppState = 'upload' | 'processing' | 'viewing'

function App() {
  const [appState, setAppState] = useState<AppState>('upload')
  const [pages, setPages] = useState<PageData[]>([])
  const [allFramedPanels, setAllFramedPanels] = useState<FramedPanel[]>([])
  const [currentPanelIndex, setCurrentPanelIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const playbackInterval = 2000 // 2 seconds default
  const [progress, setProgress] = useState<ProcessingProgress>({
    stage: 'upload',
    current: 0,
    total: 1,
    message: 'Ready to upload',
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ttsAbortRef = useRef<AbortController | null>(null)
  const ocrCacheRef = useRef<Map<string, string>>(new Map())
  const ocrInFlightRef = useRef<Map<string, Promise<string>>>(new Map())
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const currentPanelIdRef = useRef<string | null>(null)
  const workerRef = useRef<Awaited<ReturnType<typeof createWorker>> | null>(null)
  const workerInitRef = useRef<Promise<Awaited<ReturnType<typeof createWorker>>> | null>(null)
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080
  const voiceName = 'Laura - Enthusiast, Quirky Attitude'

  useEffect(() => {
    const handleResize = () => {
      // Recalculate framed panels on resize
      if (allFramedPanels.length > 0 && pages.length > 0) {
        const newFramedPanels = allFramedPanels.map((framedPanel) => {
          const pageData = pages[framedPanel.pageIndex]
          return createFramedPanel(
            framedPanel,
            pageData.width,
            pageData.height,
            window.innerWidth,
            window.innerHeight
          )
        })
        setAllFramedPanels(newFramedPanels)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [allFramedPanels, pages])

  useEffect(() => {
    if (isPlaying && allFramedPanels.length > 0) {
      intervalRef.current = window.setInterval(() => {
        setCurrentPanelIndex((prev) => {
          if (prev < allFramedPanels.length - 1) {
            return prev + 1
          } else {
            setIsPlaying(false)
            return prev
          }
        })
      }, playbackInterval)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPlaying, playbackInterval, allFramedPanels.length])

  useEffect(() => {
    if (appState === 'viewing') {
      setIsPlaying(true)
    }
  }, [appState])

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }

  const getOcrWorker = async () => {
    if (workerRef.current) return workerRef.current
    if (workerInitRef.current) return workerInitRef.current

    workerInitRef.current = (async () => {
      const worker = await createWorker({
        logger: (message) => {
          if (message.status === 'recognizing text') {
            console.debug('OCR progress:', Math.round(message.progress * 100), '%')
          }
        },
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
      })
      await worker.loadLanguage('jpn+eng')
      await worker.initialize('jpn+eng')
      await worker.setParameters({
        tessedit_pageseg_mode: '6',
      })
      workerRef.current = worker
      return worker
    })()

    return workerInitRef.current
  }

  const loadImage = async (src: string) => {
    const cached = imageCacheRef.current.get(src)
    if (cached) return cached

    const img = new Image()
    img.crossOrigin = 'anonymous'
    const loaded = await new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image for OCR'))
      img.src = src
    })
    imageCacheRef.current.set(src, loaded)
    return loaded
  }

  const getPanelCanvas = async (
    panel: FramedPanel,
    page: PageData,
    mode: 'binarized' | 'grayscale'
  ) => {
    const image = await loadImage(page.imageUrl)
    const { x, y, width, height } = panel.boundingBox
    const canvas = document.createElement('canvas')
    const scale = 2
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(image, x, y, width, height, 0, 0, canvas.width, canvas.height)

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
      const value = mode === 'binarized' ? (luminance > 180 ? 255 : 0) : luminance
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
    }
    ctx.putImageData(imageData, 0, 0)

    return canvas
  }

  const getOcrText = async (panel: FramedPanel, page: PageData) => {
    const cached = ocrCacheRef.current.get(panel.id)
    if (cached) return cached

    const existing = ocrInFlightRef.current.get(panel.id)
    if (existing) return existing

    const promise = (async () => {
      const worker = await getOcrWorker()
      const binCanvas = await getPanelCanvas(panel, page, 'binarized')
      let result = await worker.recognize(binCanvas)
      let text = result.data.text.trim()

      if (!text) {
        await worker.setParameters({ tessedit_pageseg_mode: '11' })
        const grayCanvas = await getPanelCanvas(panel, page, 'grayscale')
        result = await worker.recognize(grayCanvas)
        text = result.data.text.trim()
        await worker.setParameters({ tessedit_pageseg_mode: '6' })
      }

      if (!text) {
        console.debug('OCR: no text detected for panel', panel.id)
      } else {
        ocrCacheRef.current.set(panel.id, text)
      }

      return text
    })()

    ocrInFlightRef.current.set(panel.id, promise)
    try {
      return await promise
    } finally {
      ocrInFlightRef.current.delete(panel.id)
    }
  }


  // Keyboard navigation
  useEffect(() => {
    if (appState !== 'viewing') return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        if (currentPanelIndex < allFramedPanels.length - 1) {
          handleNext()
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (currentPanelIndex > 0) {
          handlePrevious()
        }
      } else if (e.key === 'Escape') {
        setIsPlaying(false)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [appState, currentPanelIndex, allFramedPanels.length])

  const handleFileSelect = async (file: File) => {
    if (!file) {
      console.error('❌ handleFileSelect called with no file')
      setProgress({
        stage: 'upload',
        current: 0,
        total: 1,
        message: 'Error: No file provided',
      })
      return
    }
    
    console.log('🚀 handleFileSelect called with file:', { 
      name: file.name, 
      size: file.size, 
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    })
    
    setIsPlaying(false)
    stopAudio()
    ttsAbortRef.current?.abort()
    ocrCacheRef.current.clear()
    ocrInFlightRef.current.clear()
    imageCacheRef.current.clear()
    currentPanelIdRef.current = null
    workerRef.current?.terminate()
    workerRef.current = null
    workerInitRef.current = null
    setAppState('processing')
    setProgress({ stage: 'upload', current: 1, total: 1, message: 'Uploading PDF...' })

    try {
      // Step 1: Convert PDF to images
      console.log('🔄 Starting PDF conversion...')
      setProgress({ stage: 'converting', current: 0, total: 1, message: 'Converting PDF to images...' })
      
      const pageData = await convertPDFToImages(file, (current, total) => {
        setProgress({ 
          stage: 'converting', 
          current, 
          total, 
          message: `Converting page ${current} of ${total}...` 
        })
      })
      
      console.log('✅ PDF converted, pages:', pageData.length)
      setPages(pageData)
      setProgress({ 
        stage: 'converting', 
        current: pageData.length, 
        total: pageData.length, 
        message: `Conversion complete! ${pageData.length} pages ready` 
      })

      // Step 2: Detect panels on each page
      setProgress({ stage: 'detecting', current: 0, total: pageData.length, message: 'Detecting panels...' })
      const allPanels: FramedPanel[] = []

      for (let i = 0; i < pageData.length; i++) {
        const panels = await detectPanels(pageData[i], 'rtl')
        pageData[i].panels = panels

        // Sequence panels for this page
        const sequenced = sequencePanels(panels, 'rtl')
        pageData[i].sequencedPanels = sequenced

        // Create framed panels
        for (const panel of sequenced) {
          const framed = createFramedPanel(
            panel,
            pageData[i].width,
            pageData[i].height,
            viewportWidth,
            viewportHeight
          )
          allPanels.push(framed)
        }

        setProgress({
          stage: 'detecting',
          current: i + 1,
          total: pageData.length,
          message: `Detected panels on page ${i + 1}`,
        })

        // Yield to the UI thread to prevent long stalls on large PDFs
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      // Step 3: Sequence all panels across pages
      setProgress({ stage: 'sequencing', current: 1, total: 1, message: 'Sequencing panels...' })
      setAllFramedPanels(allPanels)
      setCurrentPanelIndex(0)

      setProgress({ stage: 'complete', current: allPanels.length, total: allPanels.length, message: 'Ready to view!' })
      setTimeout(() => {
        setAppState('viewing')
      }, 500)
    } catch (error) {
      console.error('❌ Error processing PDF:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to process PDF'
      console.error('Full error:', error)
      
      setProgress({
        stage: 'upload',
        current: 0,
        total: 1,
        message: `Error: ${errorMessage}`,
      })
      setAppState('upload')
      
      // Show error alert
      alert(`Failed to process PDF:\n\n${errorMessage}\n\nCheck the browser console (F12) for more details.`)
    }
  }

  const handleNext = () => {
    if (currentPanelIndex < allFramedPanels.length - 1) {
      setCurrentPanelIndex(currentPanelIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentPanelIndex > 0) {
      setCurrentPanelIndex(currentPanelIndex - 1)
    }
  }

  const currentFramedPanel = allFramedPanels[currentPanelIndex]
  const currentPageData = currentFramedPanel
    ? pages[currentFramedPanel.pageIndex]
    : null

  useEffect(() => {
    if (appState !== 'viewing' || !currentFramedPanel || !currentPageData) return

    const panelId = currentFramedPanel.id
    currentPanelIdRef.current = panelId
    stopAudio()
    ttsAbortRef.current?.abort()
    const controller = new AbortController()
    ttsAbortRef.current = controller

    const run = async () => {
      const text = await getOcrText(currentFramedPanel, currentPageData)
      if (!text) return
      if (currentPanelIdRef.current !== panelId) return

      const response = await fetch('/api/tts/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voiceName,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.warn('TTS failed:', errorText)
        return
      }

      const audioBlob = await response.blob()
      if (controller.signal.aborted) return

      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
      }
      await audio.play()
    }

    void run()

    return () => {
      controller.abort()
    }
  }, [appState, currentFramedPanel?.id, currentPageData?.imageUrl])

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 space-y-6">
        {appState === 'upload' && (
          <PDFUpload
            onFileSelect={handleFileSelect}
            isProcessing={false}
          />
        )}

        {appState === 'processing' && <ProcessingIndicator progress={progress} />}

        {appState === 'viewing' && currentFramedPanel && currentPageData && (
          <>
            <div className="flex-1 w-full flex flex-col">
              <div className="flex-1 relative">
                <PanelViewer
                  framedPanel={currentFramedPanel}
                  pageData={currentPageData}
                  viewportWidth={viewportWidth}
                  viewportHeight={viewportHeight}
                  panelIndex={currentPanelIndex}
                />
              </div>
            </div>

          </>
        )}
      </main>
    </div>
  )
}

export default App
