import Anthropic from '@anthropic-ai/sdk'

// 환경변수 검증
if (!process.env.ANTHROPIC_API_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ANTHROPIC_API_KEY is required in production')
  } else {
    console.warn('⚠️  ANTHROPIC_API_KEY not set. AI features will not work.')
  }
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export { anthropic }
