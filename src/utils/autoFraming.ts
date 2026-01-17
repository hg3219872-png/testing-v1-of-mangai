import { Panel, FramedPanel, BoundingBox } from '../types'

export function createFramedPanel(
  panel: Panel,
  pageWidth: number,
  pageHeight: number,
  viewportWidth: number,
  viewportHeight: number
): FramedPanel {
  const { boundingBox } = panel

  // Primary crop - tight to panel bounding box
  const cropCoordinates: BoundingBox = {
    x: Math.max(0, boundingBox.x),
    y: Math.max(0, boundingBox.y),
    width: Math.min(pageWidth - boundingBox.x, boundingBox.width),
    height: Math.min(pageHeight - boundingBox.y, boundingBox.height),
  }

  // Make panel 100vw wide while preserving aspect ratio
  const targetWidth = viewportWidth // 100vw

  // Calculate scale to fit 100vw width
  const scale = targetWidth / cropCoordinates.width

  // Calculate scaled dimensions
  const scaledHeight = cropCoordinates.height * scale

  // Center vertically if needed
  const offsetX = 0 // Panel takes full width (100vw)
  const offsetY = (viewportHeight - scaledHeight) / 2

  // Determine if background suppression is needed
  const needsSuppression = scaledHeight < viewportHeight || !panel.isSplash

  return {
    ...panel,
    cropCoordinates,
    scalingMode: 'contain',
    backgroundSuppression: {
      applied: needsSuppression,
      type: needsSuppression ? 'combined' : 'blur',
    },
    viewportTransform: {
      scale,
      offsetX,
      offsetY,
    },
  }
}

export function applyBackgroundSuppression(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  pageImage: HTMLImageElement,
  framedPanel: FramedPanel,
  pageWidth: number,
  pageHeight: number
): void {
  const { cropCoordinates, backgroundSuppression } = framedPanel

  if (!backgroundSuppression.applied) return

  // Calculate aspect ratios to preserve original image proportions
  const imageAspectRatio = pageImage.width / pageImage.height
  const canvasAspectRatio = canvas.width / canvas.height
  
  // Draw the full page image preserving aspect ratio (contain mode)
  let drawWidth = canvas.width
  let drawHeight = canvas.height
  let drawX = 0
  let drawY = 0
  
  if (imageAspectRatio > canvasAspectRatio) {
    // Image is wider - fit to width, center vertically
    drawHeight = canvas.width / imageAspectRatio
    drawY = (canvas.height - drawHeight) / 2
  } else {
    // Image is taller - fit to height, center horizontally
    drawWidth = canvas.height * imageAspectRatio
    drawX = (canvas.width - drawWidth) / 2
  }
  
  // Fill background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Draw the full page image preserving aspect ratio
  ctx.drawImage(pageImage, drawX, drawY, drawWidth, drawHeight)

  // Create a mask for the focused panel area
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = canvas.width
  maskCanvas.height = canvas.height

  // Draw focused panel area (will remain sharp)
  // Calculate coordinates relative to the drawn image (not canvas)
  const focusX = drawX + (cropCoordinates.x / pageWidth) * drawWidth
  const focusY = drawY + (cropCoordinates.y / pageHeight) * drawHeight
  const focusWidth = (cropCoordinates.width / pageWidth) * drawWidth
  const focusHeight = (cropCoordinates.height / pageHeight) * drawHeight

  // Apply blur to everything except the focused area
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  
  // Create blurred version of entire image (preserving aspect ratio)
  const blurCanvas = document.createElement('canvas')
  const blurCtx = blurCanvas.getContext('2d')!
  blurCanvas.width = canvas.width
  blurCanvas.height = canvas.height
  
  // Draw image to blur canvas preserving aspect ratio
  blurCtx.fillStyle = '#000000'
  blurCtx.fillRect(0, 0, blurCanvas.width, blurCanvas.height)
  blurCtx.drawImage(pageImage, drawX, drawY, drawWidth, drawHeight)
  
  // Apply blur filter (using multiple passes for stronger blur)
  for (let i = 0; i < 3; i++) {
    blurCtx.filter = 'blur(20px)'
    blurCtx.drawImage(blurCanvas, 0, 0)
  }

  // Apply dimming and desaturation
  blurCtx.globalCompositeOperation = 'multiply'
  blurCtx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  blurCtx.fillRect(0, 0, blurCanvas.width, blurCanvas.height)

  // Draw blurred background
  ctx.drawImage(blurCanvas, 0, 0)

  // Draw sharp focused panel on top
  ctx.globalCompositeOperation = 'source-atop'
  ctx.drawImage(
    pageImage,
    cropCoordinates.x,
    cropCoordinates.y,
    cropCoordinates.width,
    cropCoordinates.height,
    focusX,
    focusY,
    focusWidth,
    focusHeight
  )

  ctx.restore()
}
