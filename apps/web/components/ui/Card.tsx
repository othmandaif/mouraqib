'use client'

import { motion } from 'framer-motion'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, className = '', hover = false, padding = 'md' }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`
        bg-surface border border-border shadow-sm rounded-sm
        ${paddingStyles[padding]}
        ${hover ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}
