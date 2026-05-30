import { useState, useRef, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { toggleSidebar } from '../redux/slices/uiSlice'
import { getAccidents, getWeather, getAlerts } from '../services/api'

export default function TopBar() {
  const dispatch = useDispatch()
  const { activeTab, offlineMode } = useSelector((state) => state.ui)
  const { data } = useSelector((state) => state.dashboard)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [alertsCount, setAlertsCount] = useState(0)
  const [weatherInfo, setWeatherInfo] = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    getAlerts().then(r => setAlertsCount(r?.alerts?.length ?? 0)).catch(() => {})
    getWeather().then(r => {
      if (r?.intensidad_label) setWeatherInfo(`${r.intensidad_label} · ${r.precipitacion_mmh || 0} mm/h`)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearch = (query) => {
    setSearchQuery(query)
    if (query.length < 2) { setSearchResults([]); return }
    getAccidents({ q: query, limit: 5 })
      .then(r => setSearchResults(r?.features || []))
      .catch(() => setSearchResults([]))
  }

  const handleSearchSelect = (item) => {
    const comuna = item.properties?.comuna || 'ubicación'
    dispatch({ type: 'ui/setActiveTab', payload: 'accidentes' })
    setShowSearch(false)
    setSearchQuery('')
  }

  return (
    <header
      className="sticky top-0 z-20 border-b backdrop-blur-md"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)'
      }}
    >
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => dispatch(toggleSidebar())}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors md:hidden hover:bg-surface-hover"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Abrir menú de navegación"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Breadcrumb */}
          <nav aria-label="Navegación secundaria">
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {activeTab === 'dashboard' ? 'Dashboard' :
               activeTab === 'accidentes' ? 'Accidentes' :
               activeTab === 'trafico' ? 'Tráfico' :
               activeTab === 'prediccion' ? 'Predicción' :
               activeTab === 'rutas' ? 'Rutas Seguras' :
               activeTab === 'asistente' ? 'Asistente IA' : activeTab}
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden sm:block" ref={searchRef}>
            <input
              type="search"
              placeholder="Buscar accidentes..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setShowSearch(true)}
              className="w-56 lg:w-72 rounded-lg border px-3 py-1.5 text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500"
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)'
              }}
              aria-label="Buscar accidentes"
            />

            {showSearch && (
              <div
                className="absolute top-full mt-1 w-full rounded-lg border shadow-lg overflow-hidden z-50"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  borderColor: 'var(--color-border)'
                }}
              >
                {searchResults.length > 0 ? (
                  searchResults.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSearchSelect(item)}
                      className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-surface-hover"
                      style={{ color: 'var(--color-text)' }}
                    >
                      <span className="font-medium">{item.properties?.comuna || 'Sin comuna'}</span>
                      <span className="ml-2" style={{ color: 'var(--color-text-muted)' }}>
                        {item.properties?.tipo} · {item.properties?.fecha?.split(' ')[0]}
                      </span>
                    </button>
                  ))
                ) : searchQuery.length >= 2 ? (
                  <div className="px-3 py-4 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Sin resultados para "{searchQuery}"
                  </div>
                ) : searchQuery.length > 0 ? (
                  <div className="px-3 py-4 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
                    Escribe al menos 2 caracteres para buscar
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Status indicators */}
          {weatherInfo ? (
            <div className="hidden lg:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              style={{ backgroundColor: 'var(--color-primary-bg)', color: 'var(--color-primary)' }}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
              </svg>
              {weatherInfo}
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Sin datos clima
            </div>
          )}

          <div className={`hidden lg:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
            offlineMode ? 'bg-amber-50 text-amber-700' : 'text-surface-500'
          }`}
            style={!offlineMode ? { backgroundColor: 'var(--color-surface-hover)', color: 'var(--color-text-muted)' } : {}}>
            <span className={`flex h-1.5 w-1.5 rounded-full ${offlineMode ? 'bg-amber-500' : 'bg-surface-400'}`} />
            {offlineMode ? 'Sin conexión' : 'En línea'}
          </div>

          {/* Alerts bell */}
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-surface-hover"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label={`Notificaciones: ${alertsCount} alertas activas`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {alertsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-2xs font-bold text-white">
                {alertsCount > 9 ? '9+' : alertsCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className="absolute top-16 right-4 w-80 rounded-xl border shadow-lg overflow-hidden z-50"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)'
              }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Notificaciones</p>
              </div>
              {alertsCount === 0 ? (
                <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  No hay notificaciones nuevas
                </div>
              ) : (
                <p className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {alertsCount} alerta(s) activa(s)
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
