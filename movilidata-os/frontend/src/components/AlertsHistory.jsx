import { useEffect, useState } from 'react'
import { getAlertsHistory, exportModule } from '../services/api'

export default function AlertsHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAlertsHistory()
      .then((data) => setHistory(data.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-surface-900">Historial de alertas</h3>
          <p className="text-xs text-surface-500">Registros recientes de movilidad y seguridad</p>
        </div>
        <button type="button" onClick={() => exportModule('alerts')} className="btn-ghost text-xs">
          Exportar alertas
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-sm text-surface-500">Cargando historial...</div>
      ) : history.length === 0 ? (
        <div className="card p-8 text-center">
          <svg className="mx-auto h-10 w-10 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-3 text-sm text-surface-500">No hay alertas registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((item, index) => (
            <div key={index} className="card">
              <div className="card-body">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-2 w-2 shrink-0 rounded-full ${
                    item.tipo?.includes('grave') || item.tipo?.includes('accidente') ? 'bg-red-500' :
                    item.tipo?.includes('clima') ? 'bg-blue-500' : 'bg-amber-500'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-surface-500">
                      <span className="font-medium text-surface-700">{item.tipo}</span>
                      <span>·</span>
                      <span>{item.fecha ? new Date(item.fecha).toLocaleString('es-CO') : ''}</span>
                    </div>
                    <p className="mt-1 text-sm text-surface-900">{item.descripcion}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
