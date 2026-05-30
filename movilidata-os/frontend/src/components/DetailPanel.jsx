import { useEffect, useRef } from 'react'

export default function DetailPanel({ open, onClose, title, children }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Panel de detalles'}
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md border-l shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="text-base font-semibold truncate" style={{ color: 'var(--color-text)' }}>
            {title || 'Detalles'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Cerrar panel"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-4rem)] p-5">
          {children || (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>Selecciona un elemento en el mapa para ver sus detalles</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
