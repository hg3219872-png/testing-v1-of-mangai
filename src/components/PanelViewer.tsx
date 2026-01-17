import { useEffect, useRef, useState } from 'react'
import { FramedPanel, PageData } from '../types'

interface PanelViewerProps {
  framedPanel: FramedPanel
  pageData: PageData
  viewportWidth: number
  viewportHeight: number
  panelIndex: number
}

const PanelViewer = ({
  framedPanel,
  pageData,
  viewportWidth,
  viewportHeight,
  panelIndex,
}: PanelViewerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [pageImage, setPageImage] = useState<HTMLImageElement | null>(null)
  const [backgroundSrc, setBackgroundSrc] = useState<string | null>(null)
  const [layout, setLayout] = useState({
    canvasWidth: 0,
    canvasHeight: 0,
    finalOffsetX: 0,
    finalOffsetY: 0,
    startTranslateX: 0,
    startTranslateY: 0,
    startScale: 1,
  })

  useEffect(() => {
    setImageLoaded(false)
    const img = new Image()
    img.onload = () => {
      setPageImage(img)
      setBackgroundSrc(pageData.imageUrl)
      setImageLoaded(true)
    }
    img.src = pageData.imageUrl
  }, [pageData.imageUrl])

  useEffect(() => {
    if (!imageLoaded || !pageImage || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!

    const containerWidth = viewportWidth
    const containerHeight = viewportHeight // 100vh

    const { cropCoordinates } = framedPanel
    const panelAspectRatio = cropCoordinates.width / cropCoordinates.height

    // Target panel size:
    // 1) Prefer full viewport height
    // 2) Cap height to the background image height (object-contain)
    // 3) If width < 75% of background width, increase width (but keep height capped)
    const minWidthRatio = 0.75
    let canvasHeight = containerHeight
    let canvasWidth = canvasHeight * panelAspectRatio

    // Compute background image placement (contain within container)
    const pageAspectRatio = pageData.width / pageData.height
    const containerAspectRatio = containerWidth / containerHeight
    let bgWidth = containerWidth
    let bgHeight = containerHeight
    let bgX = 0
    let bgY = 0

    if (pageAspectRatio > containerAspectRatio) {
      bgHeight = containerWidth / pageAspectRatio
      bgY = (containerHeight - bgHeight) / 2
    } else {
      bgWidth = containerHeight * pageAspectRatio
      bgX = (containerWidth - bgWidth) / 2
    }

    // Cap panel height to background image height
    const maxPanelHeight = bgHeight
    if (canvasHeight > maxPanelHeight) {
      canvasHeight = maxPanelHeight
      canvasWidth = canvasHeight * panelAspectRatio
    }

    // Enforce minimum width ratio relative to background width
    if (canvasWidth < bgWidth * minWidthRatio) {
      canvasWidth = bgWidth * minWidthRatio
      canvasHeight = canvasWidth / panelAspectRatio
      if (canvasHeight > maxPanelHeight) {
        canvasHeight = maxPanelHeight
        canvasWidth = canvasHeight * panelAspectRatio
      }
    }

    // Cap the panel size to 90% of the viewport while preserving aspect ratio
    const maxCanvasWidth = containerWidth * 0.9
    const maxCanvasHeight = containerHeight * 0.9
    if (canvasWidth > maxCanvasWidth) {
      canvasWidth = maxCanvasWidth
      canvasHeight = canvasWidth / panelAspectRatio
    }
    if (canvasHeight > maxCanvasHeight) {
      canvasHeight = maxCanvasHeight
      canvasWidth = canvasHeight * panelAspectRatio
    }

    canvas.width = Math.round(canvasWidth)
    canvas.height = Math.round(canvasHeight)

    // Draw the panel to fill the canvas
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(
      pageImage,
      cropCoordinates.x,
      cropCoordinates.y,
      cropCoordinates.width,
      cropCoordinates.height,
      0,
      0,
      canvas.width,
      canvas.height
    )

    // Final canvas position (centered)
    const finalOffsetX = (containerWidth - canvasWidth) / 2
    const finalOffsetY = (containerHeight - canvasHeight) / 2

    setLayout({
      canvasWidth,
      canvasHeight,
      finalOffsetX,
      finalOffsetY,
      startTranslateX: 0,
      startTranslateY: 0,
      startScale: 0.96,
    })
  }, [imageLoaded, pageImage, framedPanel, pageData, viewportWidth, viewportHeight])

  return (
    <div className="relative w-full bg-black overflow-hidden" style={{ height: '100vh' }}>
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      )}

      {/* Blurred background full page */}
      {backgroundSrc && (
        <img
          src={backgroundSrc}
          alt="Background page"
          className="absolute inset-0 w-full h-full object-contain blur-[10px] opacity-80"
        />
      )}

      {/* Focused panel on top */}
      <canvas
        ref={canvasRef}
        key={framedPanel.id}
        className="absolute panel-zoom"
        style={{ 
          display: imageLoaded ? 'block' : 'none',
          left: `${layout.finalOffsetX}px`,
          top: `${layout.finalOffsetY}px`,
          width: `${layout.canvasWidth}px`,
          height: `${layout.canvasHeight}px`,
          ['--panel-start-x' as any]: `${layout.startTranslateX}px`,
          ['--panel-start-y' as any]: `${layout.startTranslateY}px`,
          ['--panel-start-scale' as any]: `${layout.startScale}`,
        }}
      />

      {/* Panel index badge */}
      <div className="absolute top-4 left-4 z-10 rounded-full bg-black/70 text-white text-sm px-3 py-1 border border-white/20">
        Panel {panelIndex + 1}
      </div>
    </div>
  )
}

export default PanelViewer
