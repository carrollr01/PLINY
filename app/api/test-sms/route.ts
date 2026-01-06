import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

function getAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not found in environment variables')
  }
  return new Anthropic({ apiKey })
}

// In-memory state for pending actions (in production, use Redis or database)
const pendingState: Record<string, {
  type: 'confirm_delete_all_tasks' | 'confirm_delete_all_activities' | 'awaiting_duration' | 'awaiting_screen_time'
  data?: any
  timestamp: number
}> = {}

// Clean up old pending states (older than 5 minutes)
function cleanupPendingState() {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  for (const key in pendingState) {
    if (pendingState[key].timestamp < fiveMinutesAgo) {
      delete pendingState[key]
    }
  }
}

const DOMAINS = ['school', 'internship', 'personal_mastery', 'learning', 'fitness', 'social', 'admin', 'rest'] as const
const TIMEZONE = 'America/New_York'

export async function POST(req: Request) {
  const { message, sessionId = 'default' } = await req.json()

  if (!message) {
    return Response.json({ error: 'No message provided' }, { status: 400 })
  }

  cleanupPendingState()

  // Get date in user's timezone
  const now = new Date()
  const today = now.toLocaleDateString('en-CA', { timeZone: TIMEZONE }) // YYYY-MM-DD
  const dayName = now.toLocaleDateString('en-US', { timeZone: TIMEZONE, weekday: 'long' })
  
  // Calculate start of day in UTC roughly corresponding to user's midnight
  // We use the date string to construct a local-like ISO that we assume is the start
  // Note: precise alignment requires knowing the exact offset, but for now we'll use the date boundary
  // or simply filter by the 'today' string if we store dates as dates.
  // For activities (timestamps), we need a range.
  // Approximation: User's midnight is roughly UTC minus 4 or 5 hours.
  // Better: Parse the local date string.
  
  // Create a date object that corresponds to midnight in the timezone
  // We use the 'today' string (YYYY-MM-DD) which is correct for NY.
  // We'll treat this date as the anchor for "today".
  const todayDate = new Date(today) // 00:00 UTC on that date
  
  // For queries against 'created_at' (timestamptz), we need the UTC timestamp 
  // that corresponds to NY midnight (00:00 EST/EDT).
  // 00:00 NY is usually 05:00 UTC (standard) or 04:00 UTC (daylight).
  // We'll approximate with 5 hours (EST) to ensure we cover the late night logs.
  const startOfDay = new Date(todayDate)
  startOfDay.setHours(5, 0, 0, 0) 


  // Check for pending state first
  if (pendingState[sessionId]) {
    const pending = pendingState[sessionId]
    const lowerMessage = message.toLowerCase().trim()

    // Handle confirmation for delete all
    if (pending.type === 'confirm_delete_all_tasks') {
      delete pendingState[sessionId]
      if (lowerMessage === 'yes' || lowerMessage === 'y') {
        const scope = pending.data?.scope || 'today'
        let query = supabase.from('tasks').delete()
        
        if (scope === 'today') {
          query = query.eq('due_date', today)
        } else if (scope === 'this_week') {
          const endOfWeek = new Date(todayDate)
          endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()))
          query = query.lte('due_date', endOfWeek.toISOString().split('T')[0])
        }
        // scope === 'all' means no filter
        
        const { error } = await query
        if (error) {
          return Response.json({ reply: 'Failed to delete tasks. Try again.' })
        }
        return Response.json({ reply: `All tasks ${scope === 'all' ? '' : `for ${scope} `}deleted.` })
      } else {
        return Response.json({ reply: 'Cancelled. No tasks were deleted.' })
      }
    }

    if (pending.type === 'confirm_delete_all_activities') {
      delete pendingState[sessionId]
      if (lowerMessage === 'yes' || lowerMessage === 'y') {
        const scope = pending.data?.scope || 'today'
        let query = supabase.from('activities').delete()
        
        if (scope === 'today') {
          query = query.gte('created_at', startOfDay.toISOString())
        } else {
          // Safety: Supabase often requires a WHERE clause for deletes.
          // Match all records created after 1970
          query = query.gte('created_at', '1970-01-01T00:00:00Z')
        }
        
        const { error } = await query
        if (error) {
          console.error('Delete activities error:', error)
          return Response.json({ reply: 'Failed to delete activities. Try again.' })
        }
        return Response.json({ reply: `All activities ${scope === 'all' ? '' : `for ${scope} `}deleted.` })
      } else {
        return Response.json({ reply: 'Cancelled. No activities were deleted.' })
      }
    }

    if (pending.type === 'awaiting_duration') {
      delete pendingState[sessionId]
      // Parse duration from message
      const durationMatch = message.match(/(\d+)\s*(hr|hour|h|min|minute|m)?/i)
      let durationMinutes = 30 // default
      
      if (durationMatch) {
        const num = parseInt(durationMatch[1])
        const unit = durationMatch[2]?.toLowerCase() || 'm'
        if (unit.startsWith('h')) {
          durationMinutes = num * 60
        } else {
          durationMinutes = num
        }
      }

      const taskData = pending.data
      
      // Log as activity
      const { error } = await supabase.from('activities').insert({
        domain: taskData.domain,
        duration_minutes: durationMinutes,
        description: taskData.title,
        raw_message: message,
        created_at: new Date().toISOString(),
      })

      if (error) {
        return Response.json({ reply: `Task completed but failed to log activity.` })
      }
      
      return Response.json({ 
        reply: `Logged ${durationMinutes}min ${taskData.domain}. Nice work.` 
      })
    }

    if (pending.type === 'awaiting_screen_time') {
      delete pendingState[sessionId]
      
      // Fetch today's data for the summary
      const { data: tasks } = await supabase
        .from('tasks')
        .select('title')
        .eq('status', 'completed')
        .gte('completed_at', startOfDay.toISOString())

      const { data: activities } = await supabase
        .from('activities')
        .select('domain, duration_minutes, description')
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: true })

      const taskList = tasks?.map(t => t.title).join(', ') || 'None'
      const activityList = activities?.map(a => `${a.duration_minutes}m ${a.domain} (${a.description})`).join(', ') || 'None'
      
      const summaryPrompt = `You are an accountability assistant. Generate a brief daily summary (max 3 sentences) for the user.
      
      Data for today (${today}):
      - User's Screen Time: ${message}
      - Completed Tasks: ${taskList}
      - Logged Activities: ${activityList}
      
      acknowledge the screen time briefly, highlight 1 key win from their activities/tasks, and give a short encouraging closing remark.`

      const anthropic = getAnthropic()
      const completion = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: summaryPrompt }],
      })

      const summary = completion.content[0].type === 'text' ? completion.content[0].text : 'Day recorded!'
      
      return Response.json({ reply: summary })
    }
  }

  // Classification prompt
  const classificationPrompt = `You are parsing a message from a user to their accountability agent. Analyze the message and extract structured data.

Current Date: ${today} (${dayName})

Message: "${message}"

COMMAND TYPES:

1. task_create
   Use when: User wants to add a new task to complete later. May include a date and/or time.
   Examples: "I need to finish college application by 3pm today", "must finish science homework tomorrow", "add gym to my tasks for this wednesday"
   IMPORTANT: Do NOT use for past activities like "I did x", "finished y", "I sat in bed". Use activity_log for those.

2. task_complete
   Use when: User has finished a scheduled task.
   Examples: "I have just finished my science homework", "cross off my task to talk to 3 new people", "completed my gym workout"

3. task_edit
   Use when: User wants to change details of an existing task.
   Examples: "change my meeting with Grace to 5pm", "make my essay task important", "move gym to tomorrow"

4. task_delete
   Use when: User wants to cancel/remove a task (not complete it, just delete it).
   Examples: "delete my meeting with John", "cancel the dentist appointment", "remove gym from my tasks"

5. task_delete_all
   Use when: User wants to clear all scheduled tasks/to-dos.
   Examples: "delete all my tasks", "clear all tasks for today", "remove everything from my task list", "wipe my to-dos"
   IMPORTANT: "Activities" are logs of past actions. Tasks are future items. If user says "delete activities", "clear logs", "wipe history", use activity_delete_all.
   NEGATIVE EXAMPLES: "clear all activities" -> use activity_delete_all. "remove all logs" -> use activity_delete_all.

6. task_query
   Use when: User wants to see their scheduled tasks.
   Examples: "what's left today?", "what do I have due this week?", "show me my tasks"

7. activity_log
   Use when: User has completed an activity and wants to record time spent.
   Examples: "just did 2hr deep work on Philos", "finished 45min reading", "1hr boxing session", "I sat in bed for 2 hours"

8. activity_edit
   Use when: User wants to change a previously logged activity.
   Examples: "change my last activity to 90 minutes", "that reading was actually fitness", "update boxing to 45min"

9. activity_delete
   Use when: User wants to remove a single logged activity.
   Examples: "delete my last activity", "remove the boxing log", "undo that"

10. activity_delete_all
    Use when: User wants to clear all logged activities/history.
    Examples: "remove all activities", "clear today's logs", "delete all activity logs", "clear all activities", "wipe my history", "delete everything I did today"
    IMPORTANT: This is for PAST logs. Triggers: "activities", "logs", "history", "what I did".
    NEGATIVE EXAMPLES: "delete all tasks" -> use task_delete_all. "clear to-do list" -> use task_delete_all.

11. summary_request
    Use when: User explicitly asks for their daily summary.
    Examples: "summary", "give me my daily summary", "how did I do today?"

12. status
    Use when: User wants a quick snapshot of current progress.
    Examples: "status", "where am I at?", "quick update", "how's my day looking?"

13. help
    Use when: User asks what they can do or how to use the system.
    Examples: "help", "what can I say?", "how does this work?", "commands"

DOMAIN CLASSIFICATION (for activities):
- school: classes, assignments, SIBC, NDIC, Malpass, academic work
- internship: Houlihan Lokey, Riverspan, professional work
- personal_mastery: Philos, coding projects, LifeOS, skill-building, personal projects
- learning: reading, philosophy, courses, research, studying
- fitness: gym, boxing, lacrosse, running, exercise
- social: friends, calls, events, dates, hanging out
- admin: emails, errands, scheduling, logistics, chores
- rest: intentional downtime, naps, recovery, relaxation

Return ONLY a JSON object:

{
  "type": "task_create" | "task_complete" | "task_edit" | "task_delete" | "task_delete_all" | "task_query" | "activity_log" | "activity_edit" | "activity_delete" | "activity_delete_all" | "summary_request" | "status" | "help",
  "data": {
    // For task_create:
    "title": string,
    "due_date": "YYYY-MM-DD" or null,
    "due_time": "HH:MM" (24hr) or null,
    "important": boolean,

    // For task_complete:
    "task_identifier": string (keywords to match task),
    "domain": string (inferred domain for activity logging),

    // For task_edit:
    "task_identifier": string,
    "field": "title" | "due_date" | "due_time" | "important",
    "new_value": string | boolean,

    // For task_delete:
    "task_identifier": string,

    // For task_delete_all:
    "scope": "today" | "this_week" | "all",

    // For task_query:
    "timeframe": "today" | "tomorrow" | "this_week" | "all",

    // For activity_log:
    "domain": string,
    "duration_minutes": number,
    "description": string,
    "end_time": "HH:MM" (24hr) or null, // Extract if user specifies when they finished OR a range (e.g. "at 5pm", "from 10 to 12" -> "12:00"). "noon" = "12:00".
    "is_relative_to_last": boolean, // true if user says "right after that", "after last activity", "then I did...", etc.

    // For activity_edit:
    "target_description": string (keywords or "last"),
    "field": "duration_minutes" | "domain" | "description",
    "new_value": string | number,

    // For activity_delete:
    "target_description": string (keywords or "last"),

    // For activity_delete_all:
    "scope": "today" | "all"
  }
}`

  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/13fa2b17-bd31-49d8-b86e-873305f3175b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-sms/route.ts:276',message:'Starting classification',data:{message, sessionId},timestamp:Date.now(),sessionId:'debug-session', hypothesisId: 'all'})}).catch(()=>{});
    // #endregion
    const anthropic = getAnthropic()

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/13fa2b17-bd31-49d8-b86e-873305f3175b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-sms/route.ts:279',message:'Anthropic client initialized',data:{},timestamp:Date.now(),sessionId:'debug-session', hypothesisId: '1'})}).catch(()=>{});
    // #endregion

    const classificationResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: classificationPrompt }],
    })

    const classificationText = classificationResponse.content[0].type === 'text'
      ? classificationResponse.content[0].text
      : '{}'

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/13fa2b17-bd31-49d8-b86e-873305f3175b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-sms/route.ts:291',message:'Raw classification response',data:{classificationText},timestamp:Date.now(),sessionId:'debug-session', hypothesisId: '2'})}).catch(()=>{});
    // #endregion

    const jsonMatch = classificationText.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { type: 'unknown', data: {} }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/13fa2b17-bd31-49d8-b86e-873305f3175b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-sms/route.ts:296',message:'Parsed classification',data:{parsed},timestamp:Date.now(),sessionId:'debug-session', hypothesisId: '2'})}).catch(()=>{});
    // #endregion

    let reply = ''

    switch (parsed.type) {
      // ============ TASK COMMANDS ============
      
      case 'task_create': {
        const { title, due_date, due_time, important } = parsed.data

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
          reply = 'Failed to save task. Try again.'
        } else {
          const timeStr = due_time ? ` at ${due_time}` : ''
          const dateStr = due_date ? ` (${due_date})` : ''
          const importantStr = important ? ' [!]' : ''
          reply = `Added: ${title}${dateStr}${timeStr}${importantStr}`
        }
        break
      }

      case 'task_complete': {
        const { task_identifier, domain } = parsed.data

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

          // Set pending state to await duration
          pendingState[sessionId] = {
            type: 'awaiting_duration',
            data: { 
              title: task.title, 
              domain: domain || 'admin',
              taskId: task.id 
            },
            timestamp: Date.now()
          }

          reply = `✓ Completed: ${task.title}. How long did it take?`
        } else {
          reply = `No open task matching "${task_identifier}". Check spelling?`
        }
        break
      }

      case 'task_edit': {
        const { task_identifier, field, new_value } = parsed.data

        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'open')
          .ilike('title', `%${task_identifier}%`)
          .limit(1)

        if (tasks && tasks.length > 0) {
          const task = tasks[0]
          const updateData: any = {}
          updateData[field] = new_value

          const { error } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', task.id)

          if (error) {
            reply = 'Failed to update task. Try again.'
          } else {
            reply = `Updated "${task.title}": ${field} → ${new_value}`
          }
        } else {
          reply = `No open task matching "${task_identifier}".`
        }
        break
      }

      case 'task_delete': {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/13fa2b17-bd31-49d8-b86e-873305f3175b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-sms/route.ts:task_delete',message:'Handling task_delete',data:{parsedData: parsed.data},timestamp:Date.now(),sessionId:'debug-session', hypothesisId: 'classification_debug'})}).catch(()=>{});
        // #endregion
        const { task_identifier } = parsed.data

        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .ilike('title', `%${task_identifier}%`)
          .limit(1)

        if (tasks && tasks.length > 0) {
          const task = tasks[0]
          await supabase.from('tasks').delete().eq('id', task.id)
          reply = `Deleted: ${task.title}`
        } else {
          reply = `No task matching "${task_identifier}".`
        }
        break
      }

      case 'task_delete_all': {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/13fa2b17-bd31-49d8-b86e-873305f3175b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-sms/route.ts:task_delete_all',message:'Handling task_delete_all',data:{parsedData: parsed.data},timestamp:Date.now(),sessionId:'debug-session', hypothesisId: 'classification_debug'})}).catch(()=>{});
        // #endregion
        const { scope } = parsed.data
        pendingState[sessionId] = {
          type: 'confirm_delete_all_tasks',
          data: { scope },
          timestamp: Date.now()
        }
        reply = `Delete all tasks${scope !== 'all' ? ` for ${scope}` : ''}? Reply YES to confirm.`
        break
      }

      case 'task_query': {
        const { timeframe } = parsed.data
        
        let query = supabase
          .from('tasks')
          .select('*')
          .eq('status', 'open')
          .order('important', { ascending: false })
          .order('due_date', { ascending: true })
          .order('due_time', { ascending: true })

        if (timeframe === 'today') {
          query = query.eq('due_date', today)
        } else if (timeframe === 'tomorrow') {
          const tomorrow = new Date(todayDate)
          tomorrow.setDate(tomorrow.getDate() + 1)
          query = query.eq('due_date', tomorrow.toISOString().split('T')[0])
        } else if (timeframe === 'this_week') {
          const endOfWeek = new Date(todayDate)
          endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()))
          query = query.lte('due_date', endOfWeek.toISOString().split('T')[0])
        }

        const { data: tasks } = await query

        if (!tasks || tasks.length === 0) {
          reply = timeframe === 'today' 
            ? 'Nothing due today. You\'re clear.' 
            : `No tasks${timeframe !== 'all' ? ` for ${timeframe}` : ''}.`
        } else {
          const taskList = tasks.map(t => {
            const flag = t.important ? '! ' : '  '
            const time = t.due_time ? ` ${t.due_time}` : ''
            const date = t.due_date && timeframe !== 'today' ? ` (${t.due_date})` : ''
            return `${flag}${t.title}${date}${time}`
          }).join('\n')
          reply = `Tasks${timeframe !== 'all' ? ` (${timeframe})` : ''}:\n${taskList}`
        }
        break
      }

      // ============ ACTIVITY COMMANDS ============

      case 'activity_log': {
        const { domain, duration_minutes, description, end_time, is_relative_to_last } = parsed.data
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/13fa2b17-bd31-49d8-b86e-873305f3175b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-sms/route.ts:464',message:'Inside activity_log',data:{parsedData: parsed.data},timestamp:Date.now(),sessionId:'debug-session', hypothesisId: '4'})}).catch(()=>{});
        // #endregion

        // Overlap detection
        const now = new Date()
        let activityEnd = now
        const duration = duration_minutes || 30

        // Handle relative timing ("after that...")
        if (is_relative_to_last) {
          // Find the most recent activity today
          const { data: lastActivity } = await supabase
            .from('activities')
            .select('created_at, duration_minutes')
            .gte('created_at', startOfDay.toISOString())
            .order('created_at', { ascending: false })
            .limit(1)

          if (lastActivity && lastActivity.length > 0) {
             const lastEnd = new Date(lastActivity[0].created_at)
             // New activity starts when last one ended.
             // So new activity ENDs at lastEnd + new duration
             activityEnd = new Date(lastEnd.getTime() + duration * 60000)
          }
        } 
        // Handle explicit time ("at 5pm") - overrides relative if both present (though unlikely)
        else if (end_time) {
          // Parse HH:MM
          const [hours, minutes] = end_time.split(':').map(Number)
          if (!isNaN(hours) && !isNaN(minutes)) {
            const targetIsoStr = `${today}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
            
            // Apply timezone offset (approx +5h for EST->UTC)
            activityEnd = new Date(targetIsoStr + 'Z') 
            activityEnd.setHours(activityEnd.getHours() + 5) 
          }
        }

        const newStartTime = new Date(activityEnd.getTime() - duration * 60000)

        const { data: existingActivities } = await supabase
          .from('activities')
          .select('created_at, duration_minutes, description')
          .gte('created_at', startOfDay.toISOString())
          .order('created_at', { ascending: true })

        if (existingActivities && existingActivities.length > 0) {
          const overlap = existingActivities.find(activity => {
            const existingEnd = new Date(activity.created_at)
            const existingDuration = activity.duration_minutes || 0
            const existingStart = new Date(existingEnd.getTime() - existingDuration * 60000)
            
            // Check for overlap, but allow adjacent touching (start == end)
            // Overlap if (StartA < EndB) and (EndA > StartB)
            return (newStartTime < existingEnd && activityEnd > existingStart)
          })

          if (overlap) {
            reply = `Overlap with "${overlap.description}" (${overlap.duration_minutes}m). Delete it first or adjust time.`
            break
          }
        }

        const { error } = await supabase.from('activities').insert({
          domain,
          duration_minutes,
          description,
          raw_message: message,
          created_at: activityEnd.toISOString(),
        })

        if (error) {
          console.error('Database error:', error)
          reply = 'Failed to log activity.'
        } else {
          let timeLabel = ''
          if (is_relative_to_last) timeLabel = ' (after previous)'
          else if (end_time) timeLabel = ` at ${end_time}`
          
          reply = `Logged: ${duration_minutes}min ${domain} - ${description}${timeLabel}`
        }
        break
      }

      case 'activity_edit': {
        const { target_description, field, new_value } = parsed.data

        let query = supabase
          .from('activities')
          .select('*')
          .gte('created_at', startOfDay.toISOString())
          .order('created_at', { ascending: false })

        if (target_description !== 'last') {
          query = query.ilike('description', `%${target_description}%`)
        }

        const { data: activities } = await query.limit(1)

        if (activities && activities.length > 0) {
          const activity = activities[0]
          const updateData: any = {}
          updateData[field] = new_value

          const { error } = await supabase
            .from('activities')
            .update(updateData)
            .eq('id', activity.id)

          if (error) {
            reply = 'Failed to update activity.'
          } else {
            reply = `Updated "${activity.description}": ${field} → ${new_value}`
          }
        } else {
          reply = `No activity matching "${target_description}".`
        }
        break
      }

      case 'activity_delete': {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/13fa2b17-bd31-49d8-b86e-873305f3175b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-sms/route.ts:activity_delete',message:'Handling activity_delete',data:{parsedData: parsed.data},timestamp:Date.now(),sessionId:'debug-session', hypothesisId: 'classification_debug'})}).catch(()=>{});
        // #endregion
        const { target_description } = parsed.data

        let query = supabase
          .from('activities')
          .select('id, description')
          .gte('created_at', startOfDay.toISOString())
          .order('created_at', { ascending: false })

        if (target_description !== 'last') {
          query = query.ilike('description', `%${target_description}%`)
        }

        const { data: activities } = await query.limit(1)

        if (activities && activities.length > 0) {
          await supabase.from('activities').delete().eq('id', activities[0].id)
          reply = `Removed: ${activities[0].description}`
        } else {
          reply = target_description === 'last' 
            ? 'No activities to remove.' 
            : `No activity matching "${target_description}".`
        }
        break
      }

      case 'activity_delete_all': {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/13fa2b17-bd31-49d8-b86e-873305f3175b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-sms/route.ts:activity_delete_all',message:'Handling activity_delete_all',data:{parsedData: parsed.data},timestamp:Date.now(),sessionId:'debug-session', hypothesisId: 'classification_debug'})}).catch(()=>{});
        // #endregion
        const { scope } = parsed.data
        pendingState[sessionId] = {
          type: 'confirm_delete_all_activities',
          data: { scope },
          timestamp: Date.now()
        }
        reply = `Delete all activities${scope === 'today' ? ' for today' : ''}? Reply YES to confirm.`
        break
      }

      // ============ SUMMARY COMMANDS ============

      case 'summary_request': {
        pendingState[sessionId] = {
          type: 'awaiting_screen_time',
          timestamp: Date.now()
        }
        reply = 'What was your screen time today?'
        break
      }

      case 'status': {
        // Get today's tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'open')
          .eq('due_date', today)

        // Get today's activities
        const { data: activities } = await supabase
          .from('activities')
          .select('domain, duration_minutes')
          .gte('created_at', startOfDay.toISOString())

        const taskCount = tasks?.length || 0
        const completedToday = await supabase
          .from('tasks')
          .select('id')
          .eq('status', 'completed')
          .gte('completed_at', startOfDay.toISOString())
        
        const completedCount = completedToday.data?.length || 0

        // Sum time by domain
        const domainTotals: Record<string, number> = {}
        let totalMinutes = 0
        activities?.forEach(a => {
          if (a.duration_minutes) {
            domainTotals[a.domain] = (domainTotals[a.domain] || 0) + a.duration_minutes
            totalMinutes += a.duration_minutes
          }
        })

        const hours = Math.floor(totalMinutes / 60)
        const mins = totalMinutes % 60
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

        const domainSummary = Object.entries(domainTotals)
          .map(([d, m]) => `${d}: ${m}m`)
          .join(', ')

        reply = `Today: ${completedCount} done, ${taskCount} remaining. ${timeStr} logged.${domainSummary ? `\n${domainSummary}` : ''}`
        break
      }

      // ============ SYSTEM COMMANDS ============

      case 'help': {
        reply = `Commands:
- Log activity: "2hr reading", "45min gym"
- Add task: "essay due Friday", "meeting 3pm tomorrow"
- Complete task: "done with essay", "finished gym"
- Edit task: "move meeting to 4pm", "make essay important"
- Delete task: "cancel meeting", "remove essay"
- Check tasks: "what's left today?", "this week's tasks"
- Delete activity: "remove last activity", "delete gym log"
- Status: "status", "where am I at?"
- Summary: "summary"`
        break
      }

      default: {
        reply = 'Didn\'t catch that. Try "help" for commands.'
      }
    }

    return Response.json({ reply, parsed })
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/13fa2b17-bd31-49d8-b86e-873305f3175b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/test-sms/route.ts:catch',message:'Error caught',data:{error: error.message, stack: error.stack},timestamp:Date.now(),sessionId:'debug-session', hypothesisId: 'all'})}).catch(()=>{});
    // #endregion
    console.error('Error:', error)
    return Response.json({
      reply: 'Something broke. Try again?',
      error: error?.message || String(error)
    }, { status: 500 })
  }
}