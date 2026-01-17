interface PlaybackControlsProps {
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
  onNext: () => void
  onPrevious: () => void
  currentIndex: number
  totalPanels: number
  interval: number
  onIntervalChange: (interval: number) => void
  onScreenshot?: () => void
}

const PlaybackControls = ({
  isPlaying,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  currentIndex,
  totalPanels,
  interval,
  onIntervalChange,
  onScreenshot,
}: PlaybackControlsProps) => {
  return (
    <div className="bg-gray-800/90 backdrop-blur-md rounded-xl p-4 space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Panel {currentIndex + 1} of {totalPanels}</span>
          <span>{Math.round(((currentIndex + 1) / totalPanels) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalPanels) * 100}%` }}
          />
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous panel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={isPlaying ? onPause : onPlay}
          className="p-4 rounded-lg bg-primary-500 hover:bg-primary-600 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <button
          onClick={onNext}
          disabled={currentIndex === totalPanels - 1}
          className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next panel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Interval Control */}
      <div className="flex items-center justify-center space-x-4">
        <label className="text-sm text-gray-400">Interval:</label>
        <input
          type="range"
          min="500"
          max="5000"
          step="100"
          value={interval}
          onChange={(e) => onIntervalChange(Number(e.target.value))}
          className="flex-1 max-w-xs"
        />
        <span className="text-sm text-gray-400 w-16 text-right">
          {(interval / 1000).toFixed(1)}s
        </span>
      </div>

      {/* Screenshot Button */}
      {onScreenshot && (
        <div className="flex justify-center">
          <button
            onClick={onScreenshot}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm flex items-center space-x-2"
            aria-label="Capture screenshot"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Capture Screenshot</span>
          </button>
        </div>
      )}

      {/* Keyboard Hints */}
      <div className="text-center text-xs text-gray-500">
        <p>← → Arrow keys to navigate • Space to advance • ESC to pause</p>
      </div>
    </div>
  )
}

export default PlaybackControls
