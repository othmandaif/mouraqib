'use client'

import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-[11px] font-medium font-sans tracking-wide uppercase text-text-muted">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full rounded-sm border bg-white px-3 py-2
              text-sm text-text-primary font-sans
              placeholder:text-text-muted placeholder:font-normal
              border-border focus:border-primary focus:ring-2 focus:ring-primary/10
              transition-colors duration-150
              disabled:bg-surface-alt disabled:cursor-not-allowed
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-danger focus:border-danger focus:ring-danger/10' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs text-danger font-sans">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
