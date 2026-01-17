import { AmbientType } from './moodAnalysis'

const createNoiseBuffer = (audioContext: AudioContext) => {
  const bufferSize = 2 * audioContext.sampleRate
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

export const startAmbientSound = (type: AmbientType) => {
  if (type === 'none') return () => undefined

  const audioContext = new AudioContext()
  const gain = audioContext.createGain()
  gain.gain.value = 0.12
  gain.connect(audioContext.destination)

  const noiseSource = audioContext.createBufferSource()
  noiseSource.buffer = createNoiseBuffer(audioContext)
  noiseSource.loop = true

  const filter = audioContext.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 800

  noiseSource.connect(filter)
  filter.connect(gain)

  const osc = audioContext.createOscillator()
  const oscGain = audioContext.createGain()
  osc.type = 'sine'
  osc.frequency.value = 120
  oscGain.gain.value = 0.03
  osc.connect(oscGain)
  oscGain.connect(gain)

  switch (type) {
    case 'water':
      filter.frequency.value = 600
      osc.frequency.value = 90
      gain.gain.value = 0.14
      break
    case 'wind':
      filter.frequency.value = 1200
      osc.frequency.value = 60
      gain.gain.value = 0.1
      break
    case 'city':
      filter.frequency.value = 900
      osc.frequency.value = 180
      gain.gain.value = 0.08
      break
    case 'forest':
      filter.frequency.value = 1400
      osc.frequency.value = 220
      gain.gain.value = 0.09
      break
    case 'battle':
      filter.frequency.value = 400
      osc.frequency.value = 45
      gain.gain.value = 0.16
      break
    case 'room':
      filter.frequency.value = 700
      osc.frequency.value = 110
      gain.gain.value = 0.06
      break
    default:
      break
  }

  noiseSource.start()
  osc.start()

  return () => {
    noiseSource.stop()
    osc.stop()
    audioContext.close()
  }
}
