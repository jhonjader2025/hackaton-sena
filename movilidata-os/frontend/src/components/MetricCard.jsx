export default function MetricCard({ label, value, unit, trend, trendLabel, icon, color = 'primary', loading }) {
  if (loading) {
    return (
      <div className="card p-5 animate-pulse">
        <div className="h-3 w-20 rounded" style={{ backgroundColor: 'var(--color-surface-hover)' }} />
        <div className="mt-3 h-8 w-16 rounded" style={{ backgroundColor: 'var(--color-surface-hover)' }} />
      </div>
    )
  }

  const colorMap = {
    primary: { text: 'var(--color-primary)' },
    success: { text: 'var(--color-success)' },
    warning: { text: 'var(--color-warning)' },
    danger: { text: 'var(--color-danger)' }
  }

  const c = colorMap[color] || colorMap.primary

  return (
    <div className="card p-5 hover:shadow-md transition-shadow duration-150">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="kpi-label">{label}</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="kpi-value" style={{ color: 'var(--color-text)' }}>{value ?? '---'}</span>
            {unit && <span className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>{unit}</span>}
          </div>
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: c.text }}>
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
          </div>
        )}
      </div>
      {trend !== undefined && trend !== null && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
            trend >= 0 ? 'text-emerald-600' : 'text-red-600'
          }`}>
            <svg className={`h-3 w-3 ${trend >= 0 ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {Math.abs(trend).toFixed(1)}%
          </span>
          {trendLabel && <span className="text-2xs" style={{ color: 'var(--color-text-secondary)' }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  )
}
