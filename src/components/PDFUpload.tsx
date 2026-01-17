import { useRef, useState } from 'react'
import { validatePDF } from '../utils/pdfProcessor'

interface PDFUploadProps {
  onFileSelect: (file: File) => void
  isProcessing: boolean
}

const PDFUpload = ({ onFileSelect, isProcessing }: PDFUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    try {
      console.log('📄 File selected:', { 
        name: file.name, 
        type: file.type, 
        size: file.size,
        lastModified: new Date(file.lastModified).toISOString()
      })
      setError(null)
      setSelectedFileName(file.name)
      
      if (!file) {
        console.error('❌ No file object')
        setError('No file selected')
        setSelectedFileName(null)
        return
      }
      
      // Validate file
      console.log('🔍 Validating file...')
      const validation = validatePDF(file)
      
      if (!validation.valid) {
        console.error('❌ File validation failed:', validation.error)
        setError(validation.error || 'Invalid file')
        setSelectedFileName(null)
        return
      }

      console.log('✅ File validated, calling onFileSelect callback')
      // Call the parent handler
      if (typeof onFileSelect === 'function') {
        onFileSelect(file)
      } else {
        console.error('❌ onFileSelect is not a function:', typeof onFileSelect)
        setError('Internal error: file handler not available')
      }
    } catch (error) {
      console.error('❌ Error in handleFile:', error)
      setError(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setSelectedFileName(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    console.log('File dropped:', file ? { name: file.name, type: file.type } : 'no file')
    if (file) {
      handleFile(file)
    } else {
      setError('No file dropped')
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation() // Prevent event bubbling
    const file = e.target.files?.[0]
    console.log('File input changed:', file ? { name: file.name, type: file.type, size: file.size } : 'no file')
    
    if (!file) {
      console.warn('No file in input')
      setError('No file selected')
      return
    }
    
    handleFile(file)
    
    // Reset input to allow selecting the same file again (after processing)
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }, 100)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => {
          if (!isProcessing && e.target !== fileInputRef.current) {
            e.preventDefault()
            e.stopPropagation()
            fileInputRef.current?.click()
          }
        }}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? 'border-primary-500 bg-primary-500/10' 
            : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          onClick={(e) => e.stopPropagation()} // Prevent double-trigger
          className="hidden"
          disabled={isProcessing}
        />

        <div className="space-y-4">
          <div className="flex justify-center">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-200 mb-2">
              {isProcessing ? 'Processing...' : 'Upload Manga PDF'}
            </h3>
            <p className="text-gray-400">
              {isProcessing
                ? 'Please wait while we process your file'
                : 'Drag and drop a PDF file here, or click to browse'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Maximum file size: 50MB
            </p>
            {selectedFileName && !isProcessing && (
              <p className="text-sm text-primary-400 mt-2 font-medium">
                ✓ Selected: {selectedFileName}
              </p>
            )}
            {!isProcessing && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                className="mt-4 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                Browse Files
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
              <p className="text-xs mt-2 text-red-400">
                Check the browser console (F12) for more details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PDFUpload
