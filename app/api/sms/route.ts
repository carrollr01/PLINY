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

  // Handle keyword commands (case-insensitive)
  const normalizedMessage = userMessage.trim().toUpperCase()
  let reply = ''

  try {
    // Handle START keyword
    if (normalizedMessage === 'START' || normalizedMessage === 'SUBSCRIBE' || normalizedMessage === 'YES') {
      reply = "Pliny: Thanks for subscribing to our productivity tracking service! Reply HELP for help. Message frequency may vary based on your usage. Msg&data rates may apply. Consent is not a condition of purchase. Reply STOP to opt out."

      await telnyx.messages.send({
        from: process.env.TELNYX_PHONE_NUMBER,
        to: fromNumber,
        text: reply,
      })

      return new Response('Message sent', { status: 200 })
    }

    // Handle STOP keyword
    if (normalizedMessage === 'STOP' || normalizedMessage === 'UNSUBSCRIBE' || normalizedMessage === 'CANCEL' || normalizedMessage === 'END' || normalizedMessage === 'QUIT') {
      reply = "Pliny: You are unsubscribed and will receive no further messages."

      await telnyx.messages.send({
        from: process.env.TELNYX_PHONE_NUMBER,
        to: fromNumber,
        text: reply,
      })

      return new Response('Message sent', { status: 200 })
    }

    // Handle HELP keyword
    if (normalizedMessage === 'HELP' || normalizedMessage === 'INFO') {
      reply = "Pliny: Please reach out to us at rcarrol6@nd.edu or +1 (443) 895-8558 for help. Visit https://pliny-beta.vercel.app for more information."

      await telnyx.messages.send({
        from: process.env.TELNYX_PHONE_NUMBER,
        to: fromNumber,
        text: reply,
      })

      return new Response('Message sent', { status: 200 })
    }

    // Regular message - Get Claude's response
    const systemPrompt = `You are a no-nonsense accountability coach tracking activities.
When user logs an activity, extract:
- Domain (work/reading/social/fitness/screen/philos/other)
- Duration if mentioned
- Description

Respond briefly, ask one follow-up if needed. Keep it under 2 sentences. Be direct.`

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    reply = response.content[0].type === 'text'
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