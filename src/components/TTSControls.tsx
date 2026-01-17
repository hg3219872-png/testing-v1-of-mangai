import { TTSProvider } from '../types'
import { AmbientType, Mood } from '../utils/moodAnalysis'

interface TTSControlsProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  autoplay: boolean
  onAutoplayChange: (autoplay: boolean) => void
  provider: TTSProvider
  onProviderChange: (provider: TTSProvider) => void
  voiceId: string
  onVoiceIdChange: (voiceId: string) => void
  isExtractingText?: boolean
  currentMood?: Mood
  ambientEnabled?: boolean
  onAmbientEnabledChange?: (enabled: boolean) => void
  ambientType?: AmbientType
  panelContext?: string
  onPanelContextChange?: (context: string) => void
  currentText: string
  onTextChange: (text: string) => void
  onSpeak: () => void
  onStop: () => void
}

const TTSControls = ({
  enabled,
  onEnabledChange,
  autoplay,
  onAutoplayChange,
  provider,
  onProviderChange,
  voiceId,
  onVoiceIdChange,
  isExtractingText = false,
  currentMood = 'neutral',
  ambientEnabled = false,
  onAmbientEnabledChange = () => {},
  ambientType = 'none',
  panelContext = '',
  onPanelContextChange = () => {},
  currentText,
  onTextChange,
  onSpeak,
  onStop,
}: TTSControlsProps) => {
  return (
    <div className="bg-gray-800/90 backdrop-blur-md rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-100">AI Voice</h3>
          <p className="text-xs text-gray-400">Reads the current panel dialogue</p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onEnabledChange(e.target.checked)}
          />
          Enabled
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-gray-400 flex flex-col gap-2">
          Provider
          <select
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as TTSProvider)}
            className="bg-gray-700 text-gray-100 rounded-md px-3 py-2 text-sm"
          >
            <option value="elevenlabs">ElevenLabs (10k credits/mo)</option>
            <option value="google">Google Cloud TTS (1M neural chars/mo)</option>
            <option value="polly">Amazon Polly (1M neural chars/mo)</option>
            <option value="azure">Azure Speech (0.5M neural chars/mo)</option>
          </select>
        </label>

        <label className="text-xs text-gray-400 flex flex-col gap-2">
          ElevenLabs voice ID
          <input
            type="text"
            value={voiceId}
            onChange={(e) => onVoiceIdChange(e.target.value)}
            placeholder="e.g. pNInz6obpgDQGcFmaJgB"
            className="bg-gray-700 text-gray-100 rounded-md px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={autoplay}
          onChange={(e) => onAutoplayChange(e.target.checked)}
        />
        Auto-read on panel change
      </label>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Detected mood: {currentMood}</span>
        <label className="inline-flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={ambientEnabled}
            onChange={(e) => onAmbientEnabledChange(e.target.checked)}
          />
          Ambient sound on empty panels
        </label>
      </div>

      <label className="text-xs text-gray-400 flex flex-col gap-2">
        Panel context (for ambient sound)
        <input
          type="text"
          value={panelContext}
          onChange={(e) => onPanelContextChange(e.target.value)}
          placeholder="e.g. boat on ocean, city at night"
          className="bg-gray-700 text-gray-100 rounded-md px-3 py-2 text-sm"
        />
        <span className="text-[11px] text-gray-500">Ambient: {ambientType}</span>
      </label>

      <label className="text-xs text-gray-400 flex flex-col gap-2">
        Current panel dialogue
        <textarea
          value={currentText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Paste or type the dialogue for this panel"
          rows={3}
          className="bg-gray-700 text-gray-100 rounded-md px-3 py-2 text-sm resize-none"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={onSpeak}
          disabled={isExtractingText}
          className="px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors text-sm"
        >
          Speak
        </button>
        <button
          onClick={onStop}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
        >
          Stop
        </button>
        {isExtractingText && (
          <span className="text-xs text-gray-400">Extracting text...</span>
        )}
      </div>
    </div>
  )
}

export default TTSControls
