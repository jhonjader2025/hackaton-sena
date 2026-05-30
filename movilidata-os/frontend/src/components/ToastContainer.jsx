import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { removeNotification } from '../redux/slices/uiSlice'

const typeStyles = {
  success: { border: 'var(--color-success-bg)', bg: 'var(--color-success-bg)' },
  error: { border: 'var(--color-danger-bg)', bg: 'var(--color-danger-bg)' },
  warning: { border: 'var(--color-warning-bg)', bg: 'var(--color-warning-bg)' },
  info: { border: 'var(--color-primary-bg)', bg: 'var(--color-primary-bg)' }
}

const typeIcons = {
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
}

const COLORS = {
  success: { icon: '#059669', text: '#059669' },
  error: { icon: '#DC2626', text: '#DC2626' },
  warning: { icon: '#D97706', text: '#D97706' },
  info: { icon: '#2563EB', text: '#2563EB' }
}

export default function ToastContainer() {
  const dispatch = useDispatch()
  const notifications = useSelector((state) => state.ui.notifications)

  useEffect(() => {
    if (notifications.length === 0) return
    const timers = notifications.map((n) =>
      setTimeout(() => dispatch(removeNotification(n.id)), 5000)
    )
    return () => timers.forEach(clearTimeout)
  }, [notifications, dispatch])

  if (notifications.length === 0) return null

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2 md:right-6 md:top-6" role="alert" aria-live="polite">
      {notifications.map((n) => {
        const style = typeStyles[n.type] || typeStyles.info
        const color = COLORS[n.type] || COLORS.info
        return (
          <div
            key={n.id}
            className="flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all min-w-[280px] max-w-[400px]"
            style={{
              backgroundColor: style.bg,
              borderColor: style.border,
              color: 'var(--color-text)'
            }}
          >
            <svg className="h-5 w-5 shrink-0 mt-0.5" style={{ color: color.icon }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={typeIcons[n.type] || typeIcons.info} />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{n.title}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{n.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dispatch(removeNotification(n.id))}
              className="shrink-0 rounded p-1"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Cerrar notificación"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
