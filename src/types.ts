export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface Panel {
  id: string
  pageIndex: number
  boundingBox: BoundingBox
  imageData?: string // Base64 or blob URL
  isNested: boolean
  isSplash: boolean
  area: number
}

export interface FramedPanel extends Panel {
  cropCoordinates: BoundingBox
  scalingMode: 'contain' | 'cover'
  backgroundSuppression: {
    applied: boolean
    type: 'blur' | 'dim' | 'vignette' | 'combined'
  }
  viewportTransform: {
    scale: number
    offsetX: number
    offsetY: number
  }
}

export interface PageData {
  pageIndex: number
  imageUrl: string
  width: number
  height: number
  panels: Panel[]
  sequencedPanels: Panel[]
}

export interface ProcessingProgress {
  stage: 'upload' | 'converting' | 'detecting' | 'sequencing' | 'complete'
  current: number
  total: number
  message: string
}

export type TTSProvider = 'elevenlabs' | 'google' | 'polly' | 'azure'
