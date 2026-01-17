import { Panel } from '../types'

export function sequencePanels(panels: Panel[], readingDirection: 'ltr' | 'rtl' = 'rtl'): Panel[] {
  if (panels.length === 0) return []
  if (panels.length === 1) return panels

  // Group panels into horizontal rows based on Y position
  const rows: Panel[][] = []
  const tolerance = 5 // Pixels tolerance for same row (manga tier alignment)

  for (const panel of panels) {
    let placed = false
    for (const row of rows) {
      const firstPanel = row[0]
      if (Math.abs(panel.boundingBox.y - firstPanel.boundingBox.y) < tolerance) {
        row.push(panel)
        placed = true
        break
      }
    }
    if (!placed) {
      rows.push([panel])
    }
  }

  // Sort rows by Y position (top to bottom)
  rows.sort((a, b) => a[0].boundingBox.y - b[0].boundingBox.y)

  // Sort panels within each row by reading direction
  for (const row of rows) {
    if (readingDirection === 'rtl') {
      row.sort((a, b) => b.boundingBox.x - a.boundingBox.x) // Right to left
    } else {
      row.sort((a, b) => a.boundingBox.x - b.boundingBox.x) // Left to right
    }
  }

  // Flatten rows into single array
  return rows.flat()
}
