import { motion } from 'framer-motion'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Coach } from '../lib/types'

export function PrimaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-full bg-accent px-7 py-3 text-[17px] font-medium text-white transition-all duration-200 hover:bg-accent-hover active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-full bg-black/[0.05] px-7 py-3 text-[17px] font-medium text-ink transition-all duration-200 hover:bg-black/[0.08] active:scale-[0.97] disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-white shadow-card hairline ${className}`}>{children}</div>
  )
}

export function Rise({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function CoachAvatar({
  coach,
  size = 'md',
  className = '',
}: {
  coach: Coach
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const sizes = {
    sm: 'h-10 w-10 text-xl',
    md: 'h-14 w-14 text-3xl',
    lg: 'h-20 w-20 text-4xl',
    xl: 'h-28 w-28 text-6xl',
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br ${coach.gradient} ${sizes[size]} shadow-card ${className}`}
    >
      <span className="drop-shadow-sm">{coach.emoji}</span>
    </div>
  )
}

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current ? 'w-6 bg-accent' : i < current ? 'w-2 bg-accent/40' : 'w-2 bg-black/10'
          }`}
        />
      ))}
    </div>
  )
}

export function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-ink-secondary ${className}`}>
      Be More is a motivational companion, not a medical, financial or professional advice service.
      Results depend on your own efforts and are not guaranteed. For health concerns, always consult
      a qualified professional.
    </p>
  )
}
