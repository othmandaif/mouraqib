interface SeparatorProps {
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function Separator({ className = '', orientation = 'horizontal' }: SeparatorProps) {
  return (
    <div
      className={`
        ${orientation === 'horizontal' ? 'w-full h-px' : 'h-full w-px'}
        bg-border
        ${className}
      `}
    />
  )
}
