import { useEffect, useState, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setActiveTab, setOfflineMode, addNotification } from './redux/slices/uiSlice'
import { fetchDashboard } from './redux/slices/dashboardSlice'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import DetailPanel from './components/DetailPanel'
import Dashboard from './components/Dashboard'
import HeatmapAccidents from './components/HeatmapAccidents'
import TrafficMonitor from './components/TrafficMonitor'
import SafeRoute from './components/SafeRoute'
import Prediction from './components/Prediction'
import Assistant from './components/Assistant'
import AlertsHistory from './components/AlertsHistory'
import ToastContainer from './components/ToastContainer'
import ErrorBoundary from './components/ErrorBoundary'

const THEME_META = document.querySelector('meta[name="theme-color"]')

function applyTheme(dark) {
  const action = dark ? 'add' : 'remove'
  document.documentElement.classList[action]('dark')
  if (THEME_META) {
    THEME_META.content = dark ? '#0F172A' : '#F8FAFC'
  }
}

export default function App() {
  const dispatch = useDispatch()
  const { activeTab, darkMode, offlineMode } = useSelector((state) => state.ui)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailContent, setDetailContent] = useState(null)
  const [detailTitle, setDetailTitle] = useState('')

  useEffect(() => {
    applyTheme(darkMode)
  }, [darkMode])

  useEffect(() => {
    dispatch(fetchDashboard())
    const id = setInterval(() => dispatch(fetchDashboard()), 60000)
    return () => clearInterval(id)
  }, [dispatch])

  useEffect(() => {
    const handleOnline = () => {
      dispatch(setOfflineMode(false))
      dispatch(addNotification({ type: 'success', title: 'Conectado', message: 'La conexión se ha restablecido.' }))
    }
    const handleOffline = () => {
      dispatch(setOfflineMode(true))
      dispatch(addNotification({ type: 'warning', title: 'Sin conexión', message: 'Mostrando datos en caché.' }))
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [dispatch])

  const openDetail = useCallback((title, content) => {
    setDetailTitle(title)
    setDetailContent(content)
    setDetailOpen(true)
  }, [])

  const closeDetail = useCallback(() => {
    setDetailOpen(false)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-surface-900 focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
        Saltar al contenido principal
      </a>

      <ToastContainer />

      <div className="flex">
        <Sidebar />
        <div className="flex flex-col flex-1 min-h-screen max-w-full">
          <TopBar />
          <main
            id="main-content"
            className="flex-1 overflow-auto p-4 lg:p-6 space-y-6"
            role="main"
          >
            {activeTab === 'dashboard' && <ErrorBoundary><Dashboard openDetail={openDetail} /></ErrorBoundary>}
            {activeTab === 'accidentes' && <ErrorBoundary><HeatmapAccidents openDetail={openDetail} /></ErrorBoundary>}
            {activeTab === 'trafico' && <ErrorBoundary><TrafficMonitor openDetail={openDetail} /></ErrorBoundary>}
            {activeTab === 'prediccion' && <ErrorBoundary><Prediction /></ErrorBoundary>}
            {activeTab === 'rutas' && <ErrorBoundary><SafeRoute /></ErrorBoundary>}
            {activeTab === 'asistente' && <ErrorBoundary><Assistant /></ErrorBoundary>}
          </main>
        </div>
      </div>

      <DetailPanel open={detailOpen} onClose={closeDetail} title={detailTitle}>
        {detailContent}
      </DetailPanel>
    </div>
  )
}
