import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'
import Telnyx from 'telnyx'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const telnyx = new Telnyx({
  apiKey: process.env.TELNYX_API_KEY || '',
})

export async function POST(req: Request) {
  const body = await req.json()
  
  // Telnyx sends data differently than Twilio
  const data = body.data
  const eventType = data?.event_type
  
  // Only process inbound messages
  if (eventType !== 'message.received') {
    return new Response('OK', { status: 200 })
  }
  
  const payload = data.payload
  const userMessage = payload.text
  const fromNumber = payload.from.phone_number

  if (!userMessage) {
    return new Response('No message received', { status: 400 })
  }

  // Inject current date context
  const today = new Date().toISOString().split('T')[0]
  const todayDate = new Date()
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][todayDate.getDay()]

  // Get Claude's response (using the same logic as test route)
  const systemPrompt = `You are a no-nonsense accountability coach tracking activities.
  
Current Date: ${today} (${dayName})

When user logs an activity, extract:
- Domain (work/reading/social/fitness/screen/philos/other)
- Duration if mentioned
- Description

Respond briefly, ask one follow-up if needed. Keep it under 2 sentences. Be direct.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const reply = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'Error processing message'

    // Send SMS reply via Telnyx
    await telnyx.messages.send({
      from: process.env.TELNYX_PHONE_NUMBER,
      to: fromNumber,
      text: reply,
    })

    return new Response('Message sent', { status: 200 })
  } catch (error) {
    console.error('Error:', error)
    return new Response('Error processing message', { status: 500 })
  }
}