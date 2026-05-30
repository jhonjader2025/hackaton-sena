import { useEffect, useState } from 'react'
import { getTraffic, exportModule } from '../services/api'
import MapWrapper from './MapComponent'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import MetricCard from './MetricCard'

const segmentCoords = {
  'Vía 1': [6.2442, -75.5812], 'Vía 2': [6.2300, -75.5900],
  'Vía 3': [6.2600, -75.5700], 'Vía 4': [6.2150, -75.5950],
  'Vía 5': [6.2500, -75.5600], 'Vía 6': [6.2700, -75.5850],
  'Vía 7': [6.2000, -75.5750], 'Vía 8': [6.2350, -75.5650]
}

function TrafficMapMarkers({ segments }) {
  const map = useMap()
  useEffect(() => {
    if (!map || segments.length === 0) return
    const markers = segments.map((seg) => {
      const pos = segmentCoords[seg.name] || [6.24, -75.58]
      const color = seg.color === 'red' ? '#EF4444' : seg.color === 'yellow' ? '#F59E0B' : '#10B981'
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7]
      })
      return L.marker(pos, { icon })
        .bindPopup(`<strong>${seg.name}</strong><br/>Velocidad: ${seg.velocidad} km/h<br/>Estado: ${seg.color === 'red' ? 'Crítico' : seg.color === 'yellow' ? 'Moderado' : 'Fluido'}`)
    })
    markers.forEach((m) => m.addTo(map))
    return () => markers.forEach((m) => m.remove())
  }, [map, segments])
  return null
}

export default function TrafficMonitor({ openDetail }) {
  const [data, setData] = useState({ segments: [], source_status: 'unknown', source: 'cargando', summary: {} })
  const [error, setError] = useState('')

  useEffect(() => {
    const load = () => {
      getTraffic().then(setData).catch(() => setError('No se pudo cargar el tráfico.'))
    }
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  const { segments, summary, source, source_status, last_update } = data

  const segmentColors = { red: 'danger', yellow: 'warning', green: 'safe' }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">Monitoreo de Tráfico</h2>
          <p className="text-sm text-surface-500">Actualizado cada 30s · {segments.length} vías monitoreadas</p>
        </div>
        <button type="button" onClick={() => exportModule('traffic')} className="btn-secondary text-xs">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {source_status === 'degraded' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          Datos simulados — fuente principal no disponible. Última actualización: {last_update || 'N/A'}
        </div>
      )}

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</div>}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Velocidad promedio"
          value={summary?.velocidad_promedio ?? '--'}
          unit="km/h"
          color="primary"
          icon="M13 10V3L4 14h7v7l9-11h-7z"
        />
        <MetricCard
          label="Vías congestionadas"
          value={summary?.vias_congestionadas ?? '--'}
          color="danger"
          icon="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          trend={(summary?.vias_congestionadas ?? 0) > 0 ? 100 : 0}
        />
        <MetricCard
          label="Peores vías"
          value={(summary?.peores_vias || []).slice(0, 3).join(', ') || 'N/A'}
          color="warning"
          icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
      </div>

      {/* Map */}
      <div className="overflow-hidden rounded-xl border border-surface-200 shadow-sm">
        <MapWrapper height={400}>
          <TrafficMapMarkers segments={segments} />
        </MapWrapper>
      </div>

      {/* Legend + Segment List */}
      <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]">
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-surface-900">Leyenda de estado</h3>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-surface-900">Fluido</p>
                  <p className="text-2xs text-surface-500">Velocidad &gt; 35 km/h</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <div>
                  <p className="text-sm font-medium text-surface-900">Moderado</p>
                  <p className="text-2xs text-surface-500">Velocidad 20-35 km/h</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-red-500" />
                <div>
                  <p className="text-sm font-medium text-surface-900">Congestionado</p>
                  <p className="text-2xs text-surface-500">Velocidad &lt; 20 km/h</p>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <p className="label">Fuente: {source ?? 'desconocida'}</p>
              <p className="text-sm text-surface-600">Estado: {source_status ?? 'desconocido'}</p>
              {last_update && <p className="text-2xs text-surface-400 mt-1">Actualizado: {last_update}</p>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-surface-900">Segmentos viales</h3>
            <p className="text-xs text-surface-500">Detalle por vía monitoreada</p>
          </div>
          <div className="card-body space-y-2">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="flex items-center gap-3 rounded-lg border border-surface-200 p-3 hover:bg-surface-50 hover:border-surface-300 transition-all cursor-pointer"
                onClick={() => openDetail && openDetail(`Vía: ${segment.name}`, (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-surface-50 p-4">
                      <p className="kpi-label">Estado</p>
                      <span className={`badge mt-1 ${
                        segment.color === 'red' ? 'badge-danger' :
                        segment.color === 'yellow' ? 'badge-warning' : 'badge-success'
                      }`}>
                        {segment.color === 'red' ? 'Crítico' : segment.color === 'yellow' ? 'Moderado' : 'Fluido'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-surface-50 p-4">
                        <p className="kpi-label">Velocidad</p>
                        <p className="text-xl font-bold text-surface-900">{segment.velocidad} <span className="text-sm font-normal text-surface-500">km/h</span></p>
                      </div>
                      <div className="rounded-lg bg-surface-50 p-4">
                        <p className="kpi-label">Densidad</p>
                        <p className="text-xl font-bold text-surface-900">{segment.densidad ?? '--'}</p>
                      </div>
                      <div className="rounded-lg bg-surface-50 p-4">
                        <p className="kpi-label">Incidentes</p>
                        <p className="text-xl font-bold text-surface-900">{segment.incidents ?? 0}</p>
                      </div>
                      <div className="rounded-lg bg-surface-50 p-4">
                        <p className="kpi-label">Congestión</p>
                        <p className="text-xl font-bold text-surface-900">{segment.congestion ?? '--'}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${
                  segment.color === 'red' ? 'bg-red-500' : segment.color === 'yellow' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}>
                  {segment.velocidad || '?'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-900">{segment.name}</p>
                  <p className="text-2xs text-surface-500">{segment.velocidad} km/h · {segment.densidad || '--'} densidad</p>
                </div>
                <span className={`badge ${
                  segment.color === 'red' ? 'badge-danger' :
                  segment.color === 'yellow' ? 'badge-warning' : 'badge-success'
                }`}>
                  {segment.color === 'red' ? 'Crítico' : segment.color === 'yellow' ? 'Moderado' : 'Fluido'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
