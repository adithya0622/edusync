import { useEffect, useRef, useState } from 'react'

interface IntroSplashProps {
  onDone: () => void
}

const FULL_TEXT = 'Drop In'

export default function IntroSplash({ onDone }: IntroSplashProps) {
  const [displayed, setDisplayed] = useState('')
  const [fading, setFading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let idx = 0
    intervalRef.current = setInterval(() => {
      idx += 1
      setDisplayed(FULL_TEXT.slice(0, idx))
      if (idx >= FULL_TEXT.length) {
        clearInterval(intervalRef.current!)
        timeoutRef.current = setTimeout(() => {
          setFading(true)
          timeoutRef.current = setTimeout(onDone, 300)
        }, 400)
      }
    }, 80)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [onDone])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <span
        style={{
          fontFamily: 'inherit',
          fontWeight: 300,
          fontSize: '2rem',
          letterSpacing: '0.1em',
          color: '#1f2937',
        }}
      >
        {displayed}
        <span
          style={{
            display: 'inline-block',
            width: '2px',
            height: '1.2em',
            background: '#1f2937',
            marginLeft: '2px',
            verticalAlign: 'text-bottom',
            animation: 'blink 0.8s step-end infinite',
          }}
        />
      </span>
      <style>{`@keyframes blink { 50% { opacity: 0 } }`}</style>
    </div>
  )
}
