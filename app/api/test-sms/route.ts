import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not found in environment variables')
  }
  return new Anthropic({ apiKey })
}

const DOMAINS = ['school', 'internship', 'personal_mastery', 'learning', 'fitness', 'social', 'admin', 'rest']

export async function POST(req: Request) {
  const { message } = await req.json()

  if (!message) {
    return Response.json({ error: 'No message provided' }, { status: 400 })
  }

  // Inject current date context
  const today = new Date().toISOString().split('T')[0]
  const todayDate = new Date()
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][todayDate.getDay()]

  // Step 1: Classify the message type and extract structured data
  const classificationPrompt = `You are parsing a message from a user to their accountability agent. Analyze the message and extract structured data.

Current Date: ${today} (${dayName})

Message: "${message}"

RULES FOR CLASSIFICATION:
1. ACTIVITY LOG ("activity_log"): use ONLY for things the user has ALREADY DONE (past tense) or is currently doing.
   - Examples: "Just finished reading", "Working on essay", "Ran 5k", "2hr deep work".
2. TASK CREATE ("task_create"): use ONLY for things planning for the FUTURE (future tense, obligations, deadlines).
   - Examples: "Need to write essay", "Meeting tomorrow", "Finish report by Friday", "Remind me to call mom".
3. TASK COMPLETE ("task_complete"): User explicitly marking a specific task as done.
4. QUERY ("query"): User asking what is on their schedule/list.

Determine the message type and extract relevant data. Return ONLY a JSON object with this exact structure:

{
  "type": "activity_log" | "task_create" | "task_complete" | "query" | "summary_request",
  "data": {
    // For activity_log:
    "domain": "school" | "internship" | "personal_mastery" | "learning" | "fitness" | "social" | "admin" | "rest",
    "duration_minutes": number or null,
    "description": string,

    // For task_create:
    "title": string,
    "due_date": "YYYY-MM-DD" or null,
    "due_time": "HH:MM" or null,
    "important": boolean,

    // For task_complete:
    "task_identifier": string (keywords from the task title)
  }
}

Examples:
- "2hr deep work on Philos" → {"type": "activity_log", "data": {"domain": "personal_mastery", "duration_minutes": 120, "description": "Deep work on Philos"}}
- "I need to finish the Malpass essay by Friday" → {"type": "task_create", "data": {"title": "Finish Malpass essay", "due_date": "[calculated YYYY-MM-DD]", "important": true}}
- "Boxing workout 45min" → {"type": "activity_log", "data": {"domain": "fitness", "duration_minutes": 45, "description": "Boxing workout"}}
- "SIBC meeting Thursday 3pm" → {"type": "task_create", "data": {"title": "SIBC meeting", "due_date": "[calculated YYYY-MM-DD]", "due_time": "15:00", "important": false}}
- "What's left today?" → {"type": "query", "data": {}}`

  try {
    const anthropic = getAnthropic()

    // Get classification from Claude
    const classificationResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: classificationPrompt }],
    })

    const classificationText = classificationResponse.content[0].type === 'text'
      ? classificationResponse.content[0].text
      : '{}'

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = classificationText.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { type: 'unknown', data: {} }

    let reply = ''

    // Step 2: Handle based on type
    switch (parsed.type) {
      case 'activity_log': {
        const { domain, duration_minutes, description } = parsed.data

        // Save activity to database
        const { error } = await supabase.from('activities').insert({
          domain,
          duration_minutes,
          description,
          raw_message: message,
          created_at: new Date().toISOString(),
        })

        if (error) {
          console.error('Database error:', error)
          reply = 'Logged, but had trouble saving to database.'
        } else {
          // Generate contextual follow-up
          const followUpResponse = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 256,
            system: `You are a no-nonsense accountability coach. The user just logged: "${description}" (${duration_minutes || 'unknown duration'} minutes, domain: ${domain}).

Respond with ONE brief follow-up question or observation. Be direct, supportive but not cheesy. Under 2 sentences.`,
            messages: [{ role: 'user', content: message }],
          })

          reply = followUpResponse.content[0].type === 'text'
            ? followUpResponse.content[0].text
            : 'Logged.'
        }
        break
      }

      case 'task_create': {
        const { title, due_date, due_time, important } = parsed.data

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/13fa2b17-bd31-49d8-b86e-873305f3175b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-sms/route.ts:139',message:'Attempting task insert',data:{payload:{title,due_date,due_time,important,status:'open',raw_message:message}},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
        // #endregion

        const { error } = await supabase.from('tasks').insert({
          title,
          due_date,
          due_time,
          important: important || false,
          status: 'open',
          raw_message: message,
          created_at: new Date().toISOString(),
        })

        if (error) {
          console.error('Database error:', error)
           // #region agent log
           fetch('http://127.0.0.1:7242/ingest/13fa2b17-bd31-49d8-b86e-873305f3175b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-sms/route.ts:154',message:'Task insert failed',data:{error},timestamp:Date.now(),sessionId:'debug-session'})}).catch(()=>{});
           // #endregion
          reply = 'Got it, but had trouble saving the task.'
        } else {
          const timeStr = due_time ? ` at ${due_time}` : ''
          const dateStr = due_date ? ` on ${due_date}` : ''
          reply = `Added: ${title}${dateStr}${timeStr}.`
        }
        break
      }

      case 'task_complete': {
        const { task_identifier } = parsed.data

        // Find matching open task
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'open')
          .ilike('title', `%${task_identifier}%`)
          .limit(1)

        if (tasks && tasks.length > 0) {
          const task = tasks[0]
          await supabase
            .from('tasks')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', task.id)

          reply = `✓ Marked "${task.title}" as complete. Nice work.`
        } else {
          reply = `Couldn't find an open task matching "${task_identifier}". Can you be more specific?`
        }
        break
      }

      case 'query': {
        // Fetch today's open tasks
        const today = new Date().toISOString().split('T')[0]
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'open')
          .lte('due_date', today)
          .order('important', { ascending: false })
          .order('due_time', { ascending: true })

        if (!tasks || tasks.length === 0) {
          reply = 'Nothing urgent. You\'re clear for today.'
        } else {
          const taskList = tasks.map(t => {
            const time = t.due_time ? ` at ${t.due_time}` : ''
            const flag = t.important ? '!' : ''
            return `${flag}${t.title}${time}`
          }).join('\n')
          reply = `Open today:\n${taskList}`
        }
        break
      }

      case 'summary_request': {
        reply = 'What was your screen time today? (Reply with hours/minutes)'
        break
      }

      default: {
        const fallbackResponse = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 256,
          system: 'You are a no-nonsense accountability coach. Respond briefly and helpfully.',
          messages: [{ role: 'user', content: message }],
        })

        reply = fallbackResponse.content[0].type === 'text'
          ? fallbackResponse.content[0].text
          : 'Not sure what you mean. Try logging an activity or asking what\'s left today.'
      }
    }

    return Response.json({ reply, parsed })
  } catch (error: any) {
    console.error('Error:', error)
    
    const errorMessage = error?.message || String(error)
    const reply = errorMessage.includes('API_KEY') 
      ? `Configuration Error: ${errorMessage}`
      : 'Error processing your message. Try again?'

    return Response.json({
      reply,
      error: errorMessage
    }, { status: 500 })
  }
}