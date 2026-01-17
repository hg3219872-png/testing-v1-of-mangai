export type Mood =
  | 'neutral'
  | 'happy'
  | 'angry'
  | 'sad'
  | 'surprised'
  | 'fearful'
  | 'tense'
  | 'romantic'

export const inferMoodFromText = (text: string): Mood => {
  const normalized = text.toLowerCase()
  if (!normalized) return 'neutral'

  const hasExclaim = /!+/.test(text)
  const hasQuestion = /\?+/.test(text)
  const hasCaps = /[A-Z]{4,}/.test(text)

  const keywords: Array<[Mood, RegExp]> = [
    ['angry', /\b(angry|furious|rage|idiot|stupid|kill|hate|damn|shut up)\b/],
    ['happy', /\b(happy|yay|great|awesome|love|haha|lol|smile|cheer)\b/],
    ['sad', /\b(sad|cry|tears|sorry|lonely|miss you|hurt|pain)\b/],
    ['surprised', /\b(whoa|what|huh|no way|seriously|impossible)\b/],
    ['fearful', /\b(scared|afraid|terror|run|danger|help)\b/],
    ['tense', /\b(wait|listen|quiet|now|hurry|move)\b/],
    ['romantic', /\b(beautiful|darling|kiss|date|love you)\b/],
  ]

  for (const [mood, matcher] of keywords) {
    if (matcher.test(normalized)) return mood
  }

  if (hasCaps && hasExclaim) return 'angry'
  if (hasExclaim && hasQuestion) return 'surprised'
  if (hasQuestion) return 'tense'
  return 'neutral'
}

export const voiceSettingsForMood = (mood: Mood) => {
  switch (mood) {
    case 'angry':
      return { stability: 0.2, similarity_boost: 0.7 }
    case 'happy':
      return { stability: 0.35, similarity_boost: 0.8 }
    case 'sad':
      return { stability: 0.7, similarity_boost: 0.8 }
    case 'surprised':
      return { stability: 0.3, similarity_boost: 0.75 }
    case 'fearful':
      return { stability: 0.4, similarity_boost: 0.7 }
    case 'tense':
      return { stability: 0.45, similarity_boost: 0.75 }
    case 'romantic':
      return { stability: 0.6, similarity_boost: 0.85 }
    default:
      return { stability: 0.45, similarity_boost: 0.8 }
  }
}

export type AmbientType =
  | 'none'
  | 'water'
  | 'wind'
  | 'city'
  | 'forest'
  | 'battle'
  | 'room'

export const inferAmbientFromContext = (context: string): AmbientType => {
  const normalized = context.toLowerCase()
  if (!normalized) return 'none'

  if (/\b(boat|ship|ocean|sea|river|water|waves)\b/.test(normalized)) return 'water'
  if (/\b(wind|storm|breeze|sky|mountain|cliff)\b/.test(normalized)) return 'wind'
  if (/\b(city|street|traffic|crowd|market|train)\b/.test(normalized)) return 'city'
  if (/\b(forest|trees|woods|jungle|birds)\b/.test(normalized)) return 'forest'
  if (/\b(fight|battle|explosion|gun|sword|punch)\b/.test(normalized)) return 'battle'
  if (/\b(room|home|quiet|inside|office)\b/.test(normalized)) return 'room'

  return 'none'
}
