interface BadgeProps {
  variant: 'gray' | 'red' | 'green' | 'amber' | 'blue' | 'orange' | 'emerald'
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeProps['variant'], string> = {
  gray: 'bg-gray-700 text-gray-200',
  red: 'bg-red-900 text-red-200',
  green: 'bg-green-900 text-green-200',
  amber: 'bg-amber-900 text-amber-200',
  blue: 'bg-blue-900 text-blue-200',
  orange: 'bg-orange-900 text-orange-200',
  emerald: 'bg-emerald-900 text-emerald-200',
}

export default function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
