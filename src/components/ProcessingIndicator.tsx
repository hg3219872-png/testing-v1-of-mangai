import { ProcessingProgress } from '../types'

interface ProcessingIndicatorProps {
  progress: ProcessingProgress
}

const ProcessingIndicator = ({ progress }: ProcessingIndicatorProps) => {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0
  const isError = progress.message.toLowerCase().includes('error')

  return (
    <div className={`w-full max-w-2xl mx-auto backdrop-blur-md rounded-xl p-6 space-y-4 ${
      isError ? 'bg-red-900/90 border border-red-500' : 'bg-gray-800/90'
    }`}>
      <div className="text-center">
        <h3 className={`text-xl font-semibold mb-2 ${
          isError ? 'text-red-300' : 'text-gray-200'
        }`}>
          {progress.message}
        </h3>
        {!isError && (
          <p className="text-sm text-gray-400">
            {progress.stage === 'upload' && 'Uploading your PDF file...'}
            {progress.stage === 'converting' && progress.total > 1 
              ? `Converting page ${progress.current} of ${progress.total}...`
              : 'Converting PDF to images...'}
            {progress.stage === 'detecting' && `Detecting panels on page ${progress.current} of ${progress.total}...`}
            {progress.stage === 'sequencing' && 'Sequencing panels in reading order...'}
            {progress.stage === 'complete' && 'Processing complete!'}
          </p>
        )}
        {isError && (
          <p className="text-sm text-red-400 mt-2">
            Check the browser console (F12) for detailed error information
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{progress.current} / {progress.total}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className="bg-primary-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {progress.stage !== 'complete' && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      )}
    </div>
  )
}

export default ProcessingIndicator
