interface CardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  description?: string
  className?: string
}

export function Card({
  title,
  value,
  icon,
  description,
  className = '',
}: CardProps) {
  return (
    <div
      className={`rounded-lg border border-border/50 bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 p-6 transition-all duration-300 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        {icon && (
          <div className="text-3xl text-primary opacity-20 ml-4">{icon}</div>
        )}
      </div>
    </div>
  )
}
