import { format, differenceInMinutes, startOfDay, addMinutes, isAfter, isBefore } from 'date-fns'

type Activity = {
  id: string
  domain: string
  duration_minutes: number
  description: string | null
  created_at: string
}

type Props = {
  activities: Activity[]
}

const DOMAIN_COLORS: Record<string, string> = {
  school: '#5C7A99',
  internship: '#5E8C6A',
  personal_mastery: '#C17B4A',
  learning: '#7D6B8A',
  fitness: '#B85C4A',
  social: '#C4A24D',
  admin: '#7A7D80',
  rest: '#8FAA8F'
}

export default function Timeline({ activities }: Props) {
  // Assuming day starts at 7am and ends at 11pm (16 hours)
  const START_HOUR = 7
  const END_HOUR = 23
  const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60

  const now = new Date()
  const todayStart = startOfDay(now)
  todayStart.setHours(START_HOUR)

  // Calculate current time position (percentage)
  const currentMinutes = differenceInMinutes(now, todayStart)
  const currentPercentage = Math.min(Math.max((currentMinutes / TOTAL_MINUTES) * 100, 0), 100)

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm h-full flex flex-col">
      <h2 className="text-xl font-serif mb-6 text-[#8C8C8C]">Day Timeline</h2>
      
      {/* Horizontal Bar Container */}
      <div className="relative w-full h-12 bg-white border border-gray-300 rounded-md overflow-hidden flex mb-2">
        
        {/* Render Activities */}
        {activities.map((activity) => {
          // Calculate start time relative to day start
          // Note: Since we don't have explicit start_time in DB schema yet, we use created_at as END time 
          // and subtract duration. This is an approximation based on the log time.
          const endTime = new Date(activity.created_at)
          const startTime = addMinutes(endTime, -activity.duration_minutes)
          
          const startOffset = differenceInMinutes(startTime, todayStart)
          const width = activity.duration_minutes
          
          // Convert to percentages
          const left = (startOffset / TOTAL_MINUTES) * 100
          const w = (width / TOTAL_MINUTES) * 100
          const color = DOMAIN_COLORS[activity.domain] || '#7A7D80'

          // Only render if within view
          if (left + w < 0 || left > 100) return null

          return (
            <div
              key={activity.id}
              className="absolute top-0 bottom-0 flex items-center justify-center text-xs text-white font-medium truncate px-1 border-r border-white/20"
              style={{
                left: `${left}%`,
                width: `${w}%`,
                backgroundColor: color,
              }}
              title={`${activity.description} (${activity.duration_minutes}m)`}
            >
              {activity.description}
            </div>
          )
        })}

        {/* Future Time Shading (Gray out area after current time) */}
        <div 
          className="absolute top-0 bottom-0 bg-gray-100/50 backdrop-grayscale-[0.5]"
          style={{
            left: `${currentPercentage}%`,
            right: 0,
            backgroundImage: 'repeating-linear-gradient(45deg, #e5e7eb 0px, #e5e7eb 2px, transparent 2px, transparent 8px)'
          }}
        />

        {/* Current Time Indicator Line */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-black z-10"
          style={{ left: `${currentPercentage}%` }}
        >
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-mono bg-black text-white px-1 rounded">
            {format(now, 'HH:mm')}
          </div>
        </div>

      </div>

      {/* Time Labels */}
      <div className="flex justify-between text-xs font-mono text-gray-400 px-1">
        <span>7a</span>
        <span>9a</span>
        <span>11a</span>
        <span>1p</span>
        <span>3p</span>
        <span>5p</span>
        <span>7p</span>
        <span>9p</span>
        <span>11p</span>
      </div>

      {/* Legend / Activity List below */}
      <div className="mt-4 flex-1 overflow-y-auto space-y-2">
         {activities.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No activities logged yet.</p>
         )}
         {activities.map(act => (
             <div key={act.id} className="flex items-center gap-2 text-sm">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[act.domain] || '#7A7D80' }} />
                 <span className="font-medium text-[#1A1A1A]">{act.description}</span>
                 <span className="text-gray-400 text-xs">
                    {format(new Date(act.created_at), 'h:mma')} • {act.duration_minutes}m
                 </span>
             </div>
         ))}
      </div>
    </div>
  )
}