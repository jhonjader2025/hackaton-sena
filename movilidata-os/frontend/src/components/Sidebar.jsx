import { useSelector, useDispatch } from 'react-redux'
import { setActiveTab, toggleDarkMode, toggleSidebar } from '../redux/slices/uiSlice'

const navItems = [
  {
    section: 'Monitoreo',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { id: 'accidentes', label: 'Accidentes', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
      { id: 'trafico', label: 'Tráfico', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' }
    ]
  },
  {
    section: 'Análisis',
    items: [
      { id: 'prediccion', label: 'Predicción', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { id: 'rutas', label: 'Rutas Seguras', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' }
    ]
  },
  {
    section: 'Herramientas',
    items: [
      { id: 'asistente', label: 'Asistente IA', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' }
    ]
  }
]

export default function Sidebar() {
  const dispatch = useDispatch()
  const { activeTab, darkMode, sidebarOpen } = useSelector((state) => state.ui)

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 md:hidden"
          onClick={() => dispatch(toggleSidebar())}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 border-r flex flex-col transition-transform duration-250 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)'
        }}
        role="navigation"
        aria-label="Navegación principal"
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 h-16 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-secondary)' }}>Movilidata OS</p>
            <h1 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>Medellín</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Módulos">
          {navItems.map((group) => (
            <div key={group.section}>
              <p className="px-3 mb-1 text-2xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-muted)' }}>
                {group.section}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        dispatch(setActiveTab(item.id))
                        if (window.innerWidth < 768) dispatch(toggleSidebar())
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 ${
                        isActive
                          ? 'text-primary-700'
                          : 'hover:bg-surface-hover'
                      }`}
                      style={{
                        backgroundColor: isActive ? 'var(--color-primary-bg)' : 'transparent',
                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                      }}
                    >
                      <svg
                        className="h-4 w-4 shrink-0"
                        style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={isActive ? 2 : 1.5}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-3 space-y-1" style={{ borderColor: 'var(--color-border)' }}>
          <button
            type="button"
            onClick={() => dispatch(toggleDarkMode())}
            aria-label={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 hover:bg-surface-hover"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {darkMode ? (
              <svg className="h-4 w-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            {darkMode ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <div className="px-3 py-1.5">
            <p className="text-2xs" style={{ color: 'var(--color-text-muted)' }}>v1.0 · CTGI SENA 2026</p>
          </div>
        </div>
      </aside>
    </>
  )
}
