'use client'
import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, useScroll, useTransform, useSpring, MotionValue } from 'framer-motion'
import { ChevronLeft, Video, Battery, Wifi, Signal } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const messages = [
  { type: 'user', text: 'Just finished 45min of reading' },
  { type: 'agent', text: 'Logged. Fiction or non-fiction?' },
  { type: 'user', text: 'Philosophy - Nietzsche' },
  { type: 'agent', text: "Nice. That's 5 days in a row. Keep the streak going." },
  { type: 'user', text: '2hr deep work on Philos' },
  { type: 'agent', text: 'Solid session. What did you ship?' },
  { type: 'user', text: 'Finished the matching algorithm' },
  { type: 'agent', text: 'Progress. Screen time today?' },
]

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 25,
    restDelta: 0.001
  })

  // Animation values
  const phoneOpacity = useTransform(smoothProgress, [0.7, 0.85], [1, 0])
  const phoneTranslateY = useTransform(smoothProgress, [0.7, 1], [0, -100])
  
  // --- NEW: Rotation value for the blue highlight ---
  // Rotates 720 degrees (two full spins) over the course of the scroll
  const borderRotation = useTransform(smoothProgress, [0, 1], [0, 720])

  const contentOpacity = useTransform(smoothProgress, [0.75, 0.9], [0, 1])
  const contentTranslateY = useTransform(smoothProgress, [0.75, 1], [50, 0])
  const contentPointerEvents = useTransform(smoothProgress, (v) => v > 0.8 ? 'auto' : 'none')

  return (
    <div ref={containerRef} className="relative bg-black h-[250vh]" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
      
      {/* --- PHONE CONTAINER --- */}
      <motion.div 
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{
          opacity: phoneOpacity,
          y: phoneTranslateY,
        }}
      >
        {/* Phone Wrapper to hold base and rotating layers */}
        <div 
            className="relative origin-center"
            style={{ 
                width: '393px', 
                height: '852px',
                transform: 'scale(0.65)' 
            }}
        >
            
            <motion.div 
              // 8px larger on all sides to match the border thickness. Rounded corners adjusted accordingly.
              className="absolute -inset-[3px] rounded-[58px] z-0 overflow-hidden flex items-center justify-center"
              style={{ rotate: borderRotation }}
            >
               {/* The Conic gradient creating the "slice" of blue light */}
               <div 
                  className="w-[150%] h-[150%] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{
                      background: `conic-gradient(
                          from 0deg at 50% 50%, 
                          #1a1a1a 0deg,
                          #1a1a1a 100deg,
                          #2d2d2d 160deg,
                          #007AFF 176deg,
                          #ffffff 180deg,
                          #007AFF 184deg,
                          #2d2d2d 200deg,
                          #1a1a1a 260deg,
                          #1a1a1a 360deg
                      )`,
                  }}
               />
            </motion.div>

          {/* --- LAYER 2 (Front): The Phone Body & Screen --- */}
          {/* We removed the solid border.
             We use a combination of box-shadow and ring-1 to simulate shiny dark metal.
             z-10 ensures it sits ON TOP of the rotating blue light.
          */}
          <div className="relative bg-black rounded-[55px] overflow-hidden z-10 h-full w-full
                          ring-1 ring-white/20 
                          shadow-[0_0_0_8px_#1a1a1a,0_25px_50px_-12px_rgba(0,0,0,1)]"
          >
          
            {/* Dynamic Island */}
            <div className="absolute top-[11px] left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-full z-50 flex items-center justify-end pr-3">
               <div className="w-2 h-2 rounded-full bg-[#1a1a1a] opacity-60"></div>
            </div>
            
            {/* Screen Content */}
            <div className="absolute inset-0 bg-black overflow-hidden flex flex-col rounded-[48px]">
              
              {/* Status Bar */}
              <div className="h-[54px] flex items-end justify-between px-7 pb-2 text-[16px] font-semibold text-white z-40 relative select-none">
                <span className="tracking-wide">9:41</span>
                <div className="flex gap-1.5 items-center">
                  <Signal size={17} fill="currentColor" className="text-white"/>
                  <Wifi size={19} strokeWidth={2.5} className="text-white"/>
                  <div className="relative">
                     <Battery size={24} className="text-white opacity-40"/>
                     <div className="absolute top-[7px] left-[2.5px] w-[13px] h-[9px] bg-white rounded-[1.5px]"></div>
                  </div>
                </div>
              </div>

              {/* Header */}
              <div className="h-[50px] flex items-center justify-between px-4 z-40 bg-black/80 backdrop-blur-xl sticky top-0 pb-2">
                 <div className="flex items-center text-[#007AFF] -ml-2 cursor-pointer pointer-events-auto hover:opacity-80 transition-opacity">
                   <ChevronLeft size={30} strokeWidth={2.5} />
                   <span className="text-[17px] leading-none -ml-1 mt-[1px]">88</span>
                 </div>
                 
                 <div className="flex flex-col items-center justify-center -ml-4">
                   <div className="w-[34px] h-[34px] rounded-full bg-gradient-to-b from-[#A1A1A6] to-[#636366] flex items-center justify-center text-sm font-medium text-white mb-1">
                      P
                   </div>
                   <div className="flex items-center gap-1">
                       <span className="text-[12px] font-medium text-white leading-none">PLINY</span>
                       <ChevronLeft size={10} className="text-[#8E8E93] rotate-[-90deg]" strokeWidth={3} />
                   </div>
                 </div>

                 <div className="w-10 flex justify-end text-[#007AFF] pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity">
                   <Video size={26} fill="currentColor" stroke="none" className="opacity-90"/>
                 </div>
              </div>

              {/* Scrollable Messages */}
              <div className="flex-1 w-full flex flex-col justify-end pb-4 px-4 relative">
                   <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />
                   
                   <div className="flex flex-col justify-end space-y-[2px] w-full">
                     {messages.map((msg, i) => (
                       <ScrollMessageBubble 
                         key={i} 
                         message={msg} 
                         index={i} 
                         total={messages.length}
                         progress={smoothProgress}
                       />
                     ))}
                   </div>
              </div>

              {/* Input Area */}
               <div className="h-[60px] w-full px-5 pb-6 bg-black flex items-center gap-3 shrink-0">
                   <div className="flex-1 h-[38px] rounded-full border border-[#3A3A3C] flex items-center px-4 bg-[#1C1C1E]">
                       <span className="text-[#8E8E93] text-[17px]">iMessage</span>
                   </div>
                   <div className="w-8 h-8 flex items-center justify-center">
                      <div className="w-[22px] h-[22px] rounded-full border-[2.5px] border-[#8E8E93] border-t-transparent -rotate-45" />
                   </div>
               </div>

               {/* Home Indicator */}
               <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[135px] h-[5px] bg-white rounded-full opacity-40" />

            </div>
          </div>
        </div>
      </motion.div>

      {/* --- BOTTOM CTA (Outside Phone) --- */}
      <motion.div 
        className="fixed inset-0 flex flex-col items-center justify-center"
        style={{
          opacity: contentOpacity,
          y: contentTranslateY,
          pointerEvents: contentPointerEvents as any
        }}
      >
        <div className="text-center space-y-4 px-8">
          <h1 className="text-4xl font-bold text-white leading-tight">
            The productivity tracker that meets you where you already are
          </h1>
          <p className="text-2xl text-gray-400">No apps, no nonsense</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-8 px-8 py-4 bg-[#007AFF] text-white rounded-full text-lg font-semibold hover:bg-[#0051D5] transition-colors shadow-lg"
          >
            Start Tracking
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function ScrollMessageBubble({ 
  message, 
  index, 
  total, 
  progress 
}: { 
  message: { type: string, text: string }, 
  index: number, 
  total: number, 
  progress: MotionValue<number> 
}) {
  const isUser = message.type === 'user'
  
  const step = 0.6 / total
  const start = index * step
  const end = start + step

  const opacity = useTransform(progress, [start, end], [0, 1])
  const y = useTransform(progress, [start, end], [20, 0])
  const scale = useTransform(progress, [start, end], [0.8, 1])

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className={cn(
        "flex w-full mb-2 relative origin-bottom",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "relative max-w-[75%] px-[12px] py-[7px] text-[17px] leading-[22px]",
        isUser 
          ? "bg-[#007AFF] text-white rounded-[18px] rounded-br-[4px]" 
          : "bg-[#262626] text-white rounded-[18px] rounded-bl-[4px]"
      )}>
        {message.text}
        
        {isUser ? (
             <svg className="absolute bottom-0 -right-[4px] w-[21px] h-[20px] text-[#007AFF]" viewBox="0 0 21 20" fill="currentColor">
                <path d="M0 20C4.35 20 7.42 18.99 9.68 16.29C10.82 14.93 11.39 12.78 11.08 9.94C11.02 9.4 11.58 9.11 11.96 9.46C12.56 10.03 12.98 10.83 13.09 11.75C13.43 14.49 12.74 16.96 11.13 18.67C7.62 22.38 2.95 23.12 -1.17 23.12L-1.17 20H0Z" />
             </svg>
        ) : (
            <svg className="absolute bottom-0 -left-[4px] w-[21px] h-[20px] text-[#262626] transform scale-x-[-1]" viewBox="0 0 21 20" fill="currentColor">
                <path d="M0 20C4.35 20 7.42 18.99 9.68 16.29C10.82 14.93 11.39 12.78 11.08 9.94C11.02 9.4 11.58 9.11 11.96 9.46C12.56 10.03 12.98 10.83 13.09 11.75C13.43 14.49 12.74 16.96 11.13 18.67C7.62 22.38 2.95 23.12 -1.17 23.12L-1.17 20H0Z" />
            </svg>
        )}
      </div>
    </motion.div>
  )
}