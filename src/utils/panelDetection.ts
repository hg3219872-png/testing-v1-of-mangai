import { Panel, BoundingBox, PageData } from '../types'

export async function detectPanels(pageData: PageData, _readingDirection: 'ltr' | 'rtl' = 'rtl'): Promise<Panel[]> {
  const { imageUrl, width, height } = pageData

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      // Downscale for faster detection, then scale boxes back up
      const maxDetectDim = 1200
      const maxDim = Math.max(width, height)
      const detectScale = maxDim > maxDetectDim ? maxDetectDim / maxDim : 1
      const detectWidth = Math.max(1, Math.round(width * detectScale))
      const detectHeight = Math.max(1, Math.round(height * detectScale))

      canvas.width = detectWidth
      canvas.height = detectHeight
      ctx.drawImage(img, 0, 0, detectWidth, detectHeight)

      const imageData = ctx.getImageData(0, 0, detectWidth, detectHeight)
      let panels = analyzeImageForPanels(imageData, detectWidth, detectHeight, pageData.pageIndex)

      if (detectScale !== 1) {
        const invScale = 1 / detectScale
        panels = panels.map((panel, index) => {
          const scaledBox: BoundingBox = {
            x: Math.max(0, Math.round(panel.boundingBox.x * invScale)),
            y: Math.max(0, Math.round(panel.boundingBox.y * invScale)),
            width: Math.min(width, Math.round(panel.boundingBox.width * invScale)),
            height: Math.min(height, Math.round(panel.boundingBox.height * invScale)),
          }
          const area = scaledBox.width * scaledBox.height
          const isSplash = area > width * height * 0.8
          return {
            ...panel,
            id: `page-${pageData.pageIndex}-panel-${index}`,
            pageIndex: pageData.pageIndex,
            boundingBox: scaledBox,
            area,
            isSplash,
          }
        })
      }

      resolve(panels)
    }
    img.src = imageUrl
  })
}

function analyzeImageForPanels(
  imageData: ImageData,
  width: number,
  height: number,
  pageIndex: number
): Panel[] {
  // Simplified panel detection using edge detection and contour finding
  // This is a basic implementation - can be enhanced with more sophisticated algorithms
  
  const data = imageData.data
  const threshold = 200 // Edge detection threshold
  const minPanelArea = (width * height) * 0.02 // Minimum 2% of page area
  const gutterSize = Math.min(width, height) * 0.02 // 2% of smaller dimension

  // Create edge map
  const edges = new Uint8Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Simple Sobel edge detection
      const gx = -data[((y - 1) * width + (x - 1)) * 4] + data[((y - 1) * width + (x + 1)) * 4]
        - 2 * data[(y * width + (x - 1)) * 4] + 2 * data[(y * width + (x + 1)) * 4]
        - data[((y + 1) * width + (x - 1)) * 4] + data[((y + 1) * width + (x + 1)) * 4]
      
      const gy = -data[((y - 1) * width + (x - 1)) * 4] - 2 * data[((y - 1) * width + x) * 4]
        - data[((y - 1) * width + (x + 1)) * 4] + data[((y + 1) * width + (x - 1)) * 4]
        + 2 * data[((y + 1) * width + x) * 4] + data[((y + 1) * width + (x + 1)) * 4]
      
      const magnitude = Math.sqrt(gx * gx + gy * gy)
      edges[y * width + x] = magnitude > threshold ? 255 : 0
    }
  }

  // Find connected components (panels)
  const visited = new Set<number>()
  const panels: Panel[] = []
  let panelId = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      if (edges[idx] === 0 && !visited.has(idx)) {
        // Flood fill to find panel region
        const region = floodFill(edges, width, height, x, y, visited)
        
        if (region.length > minPanelArea) {
          const bbox = calculateBoundingBox(region, width)
          
          // Expand slightly to include gutters
          const expandedBbox: BoundingBox = {
            x: Math.max(0, bbox.x - gutterSize),
            y: Math.max(0, bbox.y - gutterSize),
            width: Math.min(width - bbox.x, bbox.width + gutterSize * 2),
            height: Math.min(height - bbox.y, bbox.height + gutterSize * 2),
          }

          const area = expandedBbox.width * expandedBbox.height
          const isSplash = area > (width * height) * 0.8

          panels.push({
            id: `page-${pageIndex}-panel-${panelId++}`,
            pageIndex,
            boundingBox: expandedBbox,
            isNested: false, // Simplified - would need more complex logic
            isSplash,
            area,
          })
        }
      }
    }
  }

  // If no panels detected, treat entire page as one panel
  if (panels.length === 0) {
    panels.push({
      id: `page-${pageIndex}-panel-0`,
      pageIndex,
      boundingBox: { x: 0, y: 0, width, height },
      isNested: false,
      isSplash: true,
      area: width * height,
    })
  }

  return panels
}

function floodFill(
  edges: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  visited: Set<number>
): number[] {
  const region: number[] = []
  const stack: [number, number][] = [[startX, startY]]

  while (stack.length > 0) {
    const [x, y] = stack.pop()!
    const idx = y * width + x

    if (x < 0 || x >= width || y < 0 || y >= height || visited.has(idx) || edges[idx] !== 0) {
      continue
    }

    visited.add(idx)
    region.push(idx)

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }

  return region
}

function calculateBoundingBox(region: number[], width: number): BoundingBox {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const idx of region) {
    const x = idx % width
    const y = Math.floor(idx / width)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}
