import { useEffect, useMemo, useCallback, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchPrediction, setFecha, setHora } from '../redux/slices/predictionSlice'
import MapWrapper from './MapComponent'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { exportModule } from '../services/api'
import MetricCard from './MetricCard'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts'

function PredictionHeatLayer({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!map || points.length === 0) return
    const heat = L.heatLayer(points, { radius: 30, blur: 20, maxZoom: 15 })
    heat.addTo(map)
    return () => { map.removeLayer(heat) }
  }, [map, points])
  return null
}

export default function Prediction() {
  const dispatch = useDispatch()
  const { data, fecha, hora, loading, error } = useSelector((state) => state.prediction)

  useEffect(() => {
    dispatch(fetchPrediction({ fecha, hora }))
  }, [])

  const handleConsult = useCallback(() => {
    dispatch(fetchPrediction({ fecha, hora }))
  }, [dispatch, fecha, hora])

  const chartData = useMemo(() => {
    if (!data?.series) return []
    const combined = []
    const hist = data.series.historico || []
    const pred = data.series.pronostico || []
    const maxLen = Math.max(hist.length, pred.length)
    for (let i = 0; i < maxLen; i++) {
      const entry = {}
      if (i < hist.length) {
        const parts = hist[i].hora.includes(' ') ? hist[i].hora.split(' ')[1] : hist[i].hora
        entry.hora = parts
        entry.historico = +(hist[i].valor * 100).toFixed(1)
      }
      if (i < pred.length) {
        const parts = pred[i].hora.includes(' ') ? pred[i].hora.split(' ')[1] : pred[i].hora
        entry.hora = entry.hora || parts
        entry.pronostico = +(pred[i].probabilidad * 100).toFixed(1)
      }
      combined.push(entry)
    }
    return combined
  }, [data])

  const heatPoints = useMemo(() => {
    return (data?.heatmap?.features || []).map((f) => [
      f.geometry.coordinates[1], f.geometry.coordinates[0],
      f.properties?.probabilidad || 0.5
    ])
  }, [data])

  const avgProb = useMemo(() => {
    if (heatPoints.length === 0) return 0
    return heatPoints.reduce((s, p) => s + p[2], 0) / heatPoints.length
  }, [heatPoints])

  const riskLevel = avgProb > 0.5 ? { color: 'danger', label: 'Crítico' } :
    avgProb > 0.3 ? { color: 'warning', label: 'Moderado' } :
    { color: 'success', label: 'Bajo' }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">Predicción de congestión</h2>
          <p className="text-sm text-surface-500">Pronóstico con 2-4h de antelación usando modelo SARIMA</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleConsult} disabled={loading} className="btn-primary">
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
          <button type="button" onClick={() => exportModule('prediction')} className="btn-secondary">
            Exportar CSV
          </button>
        </div>
      </div>

      {loading && (
        <div className="card p-8 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-surface-500">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Cargando predicción...
          </div>
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}

      <div className="card p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="label">
            Fecha
            <input type="date" value={fecha} onChange={(e) => dispatch(setFecha(e.target.value))} className="input mt-1" aria-label="Fecha de predicción" />
          </label>
          <label className="label">
            Hora
            <select value={hora} onChange={(e) => dispatch(setHora(Number(e.target.value)))} className="select mt-1" aria-label="Hora de predicción">
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Riesgo estimado"
              value={`${(avgProb * 100).toFixed(0)}%`}
              color={riskLevel.color}
              icon="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              trend={(avgProb * 100).toFixed(0) > 30 ? avgProb : -avgProb}
            />
            <MetricCard
              label="Modelo"
              value={data.model_info?.nombre ?? 'N/A'}
              icon="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"
              color="primary"
            />
            <MetricCard
              label="Variables"
              value={(data.model_info?.variables || []).length}
              unit="variables"
              icon="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
              color="success"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              {chartData.length > 0 && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="text-sm font-semibold text-surface-900">Series temporales: histórico vs. predicho</h3>
                  </div>
                  <div className="card-body">
                    <div style={{ height: 280 }}>
                      <ResponsiveContainer>
                        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="hora" tick={{ fontSize: 11 }} stroke="#64748B" />
                          <YAxis tick={{ fontSize: 11 }} stroke="#64748B" unit="%" domain={[0, 100]} />
                          <Tooltip formatter={(value) => `${value.toFixed(1)}%`} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} />
                          <Legend />
                          <Line type="monotone" dataKey="historico" stroke="#3B82F6" strokeWidth={2} dot={{ r: 2 }} name="Histórico" />
                          <Line type="monotone" dataKey="pronostico" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Pronóstico" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 flex gap-4 text-2xs text-surface-500">
                      <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-blue-500" /> Histórico reciente</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-amber-500" /> Pronóstico</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="card">
                <div className="card-body">
                  <p className="label">Información del modelo</p>
                  <p className="text-sm text-surface-600">{data.model_info?.metrica ?? ''}</p>
                  <p className="mt-2 text-xs text-surface-500">MAE simulado — validación cruzada</p>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <p className="label">Fuente</p>
                  <p className="text-sm text-surface-900">{data.metadata?.fuente ?? 'SIM'}</p>
                  <p className="mt-1 text-2xs text-surface-500">Generado: {data.metadata?.fecha_generacion?.split('T')[0] ?? 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {heatPoints.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-surface-900">Mapa de calor de congestión</h3>
              </div>
              <div className="card-body">
                <div className="overflow-hidden rounded-xl border border-surface-200">
                  <MapWrapper height={380}>
                    <PredictionHeatLayer points={heatPoints} />
                  </MapWrapper>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
