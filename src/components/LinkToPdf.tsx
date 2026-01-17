const LinkToPdf = () => {
  return null
}

export default LinkToPdf

/* Deprecated UI (kept for reference)
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleDownload = async () => {
    setError(null)
    setSuccess(null)

    if (!url.trim()) {
      setError('Please paste a chapter link.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/mangaread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        let message = `Server error (${response.status}) while creating PDF.`
        if (contentType.includes('application/json')) {
          const payload = await response.json().catch(() => null)
          if (payload?.error) {
            message = payload.error
          }
        } else {
          const text = await response.text().catch(() => '')
          if (text.trim()) {
            message = text.slice(0, 300)
          }
        }
        throw new Error(message)
      }

      const blob = await response.blob()
      const filename =
        extractFilename(response.headers.get('content-disposition')) || 'chapter.pdf'

      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)

      setSuccess(`Download started: ${filename}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-800/60 border border-gray-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-2">
        Create PDF from Mangaread link
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        Paste a chapter URL from mangaread.org and download a clean PDF in the correct
        page order.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.mangaread.org/manga/.../chapter-..."
          className="flex-1 rounded-lg bg-gray-900 border border-gray-700 text-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="button"
          onClick={handleDownload}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Building PDF…' : 'Download PDF'}
        </button>
      </div>
      <div className="mt-3 text-xs text-gray-500">
        Local server required: run <span className="text-gray-300">npm run server</span>
      </div>
      {error && (
        <div className="mt-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 text-sm text-green-300 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
          {success}
        </div>
      )}
    </div>
  )
}
*/
