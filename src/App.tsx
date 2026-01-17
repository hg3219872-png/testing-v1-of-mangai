import { useState, useEffect, useRef } from 'react'
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
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080

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
                  viewportHeight={viewportHeight - 200} // Reserve space for controls
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
