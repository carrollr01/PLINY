import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'
import twilio from 'twilio'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function POST(req: Request) {
  const formData = await req.formData()
  const userMessage = formData.get('Body') as string
  const fromNumber = formData.get('From') as string

  if (!userMessage) {
    return new Response('No message received', { status: 400 })
  }

  // Get Claude's response
  const systemPrompt = `You are a no-nonsense accountability coach tracking activities.

When user logs an activity, extract:
- Domain (work/reading/social/fitness/screen/philos/other)
- Duration if mentioned
- Description

Respond briefly, ask one follow-up if needed. Keep it under 2 sentences. Be direct.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const reply = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'Error processing message'

    // TODO: Parse and save to database (we'll add this in Day 2)

    // Send SMS reply via Twilio
    await twilioClient.messages.create({
      body: reply,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: fromNumber,
    })

    return new Response('Message sent', { status: 200 })
  } catch (error) {
    console.error('Error:', error)
    return new Response('Error processing message', { status: 500 })
  }
}