export default function ProgressBar({ percent, size = 'md', showLabel = true }) {
  const heightClass = size === 'sm' ? 'h-1.5' : size === 'lg' ? 'h-4' : 'h-2.5'
  const colorClass = percent >= 100 ? 'bg-success-500' : percent >= 75 ? 'bg-primary-500' : percent >= 50 ? 'bg-warning-500' : 'bg-danger-500'

  return (
    <div className="flex items-center gap-3">
      <div className={`flex-1 ${heightClass} bg-gray-100 rounded-full overflow-hidden`}>
        <div
          className={`${heightClass} ${colorClass} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {showLabel && <span className="text-xs font-medium text-gray-600 w-12 text-right">{percent}%</span>}
    </div>
  )
}
