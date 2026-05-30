import { useEffect, useMemo, useState } from 'react'
import MapWrapper from './MapComponent'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'
import { getAccidents } from '../services/api'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import MetricCard from './MetricCard'

function HeatLayer({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !points || points.length === 0) return
    const heat = L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 17 })
    heat.addTo(map)
    return () => { map.removeLayer(heat) }
  }, [map, points])
  return null
}

export default function HeatmapAccidents({ openDetail }) {
  const [features, setFeatures] = useState([])
  const [selectedComuna, setSelectedComuna] = useState('Todas')
  const [selectedType, setSelectedType] = useState('Todos')
  const [selectedSeverity, setSelectedSeverity] = useState('Todas')
  const [dateInicio, setDateInicio] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [selectedYear, setSelectedYear] = useState('Todos')

  useEffect(() => {
    getAccidents().then((data) => setFeatures(data.features || [])).catch(() => {})
  }, [])

  const { comunas, types, years } = useMemo(() => {
    const cSet = new Set(); const tSet = new Set(); const ySet = new Set()
    features.forEach((f) => {
      const p = f.properties || {}
      if (p.comuna) cSet.add(p.comuna)
      if (p.tipo) tSet.add(p.tipo)
      if (p.fecha) ySet.add(p.fecha.split('-')[0])
    })
    return {
      comunas: ['Todas', ...Array.from(cSet).filter(Boolean)],
      types: ['Todos', ...Array.from(tSet).filter(Boolean)],
      years: ['Todos', ...Array.from(ySet).filter(Boolean).sort()]
    }
  }, [features])

  const filtered = useMemo(() => {
    return features.filter((f) => {
      const p = f.properties || {}
      if (selectedComuna !== 'Todas' && p.comuna !== selectedComuna) return false
      if (selectedType !== 'Todos' && p.tipo !== selectedType) return false
      if (selectedSeverity !== 'Todas' && String(p.gravedad) !== selectedSeverity) return false
      if (selectedYear !== 'Todos' && p.fecha?.startsWith(selectedYear) === false) return false
      if (dateInicio && p.fecha && p.fecha < dateInicio) return false
      if (dateFin && p.fecha && p.fecha > dateFin + ' 23:59:59') return false
      return true
    })
  }, [features, selectedComuna, selectedType, selectedSeverity, selectedYear, dateInicio, dateFin])

  const points = filtered
    .filter((f) => f.geometry && f.geometry.coordinates)
    .map((f) => [
      f.geometry.coordinates[1], f.geometry.coordinates[0], 0.5
    ])

  const barData = useMemo(() => {
    const counts = {}
    filtered.forEach((f) => {
      const c = f.properties?.comuna || 'Sin comuna'
      counts[c] = (counts[c] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([comuna, accidentes]) => ({ comuna, accidentes }))
  }, [filtered])

  const lineData = useMemo(() => {
    const counts = {}
    filtered.forEach((f) => {
      const d = f.properties?.fecha
      if (!d) return
      const key = d.substring(0, 7)
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])).slice(-24)
      .map(([mes, accidentes]) => ({ mes, accidentes }))
  }, [filtered])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">Zonas Críticas de Accidentalidad</h2>
          <p className="text-sm text-surface-500">Mapa de calor, filtros y tendencias históricas</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Incidentes mostrados" value={filtered.length} color="danger" icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        <MetricCard label="Comunas afectadas" value={barData.length} color="warning" icon="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <MetricCard label="Tipo más frecuente" value={types[1] || '---'} color="primary" icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="label sm:col-span-1">
            Comuna
            <select value={selectedComuna} onChange={(e) => setSelectedComuna(e.target.value)} className="select mt-1" aria-label="Filtrar por comuna">
              {comunas.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="label sm:col-span-1">
            Tipo
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="select mt-1" aria-label="Filtrar por tipo">
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="label sm:col-span-1">
            Gravedad
            <select value={selectedSeverity} onChange={(e) => setSelectedSeverity(e.target.value)} className="select mt-1" aria-label="Filtrar por gravedad">
              <option value="Todas">Todas</option>
              <option value="1">Leve</option>
              <option value="2">Moderada</option>
              <option value="3">Grave</option>
            </select>
          </label>
          <label className="label sm:col-span-1">
            Año
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="select mt-1" aria-label="Filtrar por año">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="label sm:col-span-1">
            Fecha inicio
            <input type="date" value={dateInicio} onChange={(e) => setDateInicio(e.target.value)} className="input mt-1" aria-label="Fecha inicio" />
          </label>
          <label className="label sm:col-span-1">
            Fecha fin
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="input mt-1" aria-label="Fecha fin" />
          </label>
        </div>
      </div>

      {/* Map + Ranking */}
      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="overflow-hidden rounded-xl border border-surface-200 shadow-sm">
          <MapWrapper height={420}>
            <HeatLayer points={points} />
          </MapWrapper>
        </div>

        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-surface-900">Top zonas críticas</h3>
              <p className="text-xs text-surface-500">Comunas con mayor siniestralidad</p>
            </div>
            <div className="card-body">
              {barData.length === 0 ? (
                <p className="text-sm text-surface-500 text-center py-4">Sin datos para los filtros actuales</p>
              ) : (
                <div className="space-y-1">
                  {barData.slice(0, 5).map((item, i) => (
                    <div key={item.comuna} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-50 transition-colors cursor-pointer"
                      onClick={() => openDetail && openDetail(`Detalles: ${item.comuna}`, (
                        <div className="space-y-3">
                          <div className="rounded-lg bg-surface-50 p-4">
                            <p className="kpi-label">Comuna</p>
                            <p className="text-lg font-semibold text-surface-900">{item.comuna}</p>
                          </div>
                          <div className="rounded-lg bg-surface-50 p-4">
                            <p className="kpi-label">Accidentes registrados</p>
                            <p className="text-2xl font-bold text-danger">{item.accidentes}</p>
                          </div>
                          <div className="rounded-lg bg-surface-50 p-4">
                            <p className="kpi-label">Participación</p>
                            <p className="text-lg font-semibold text-surface-900">
                              {((item.accidentes / barData.reduce((s, b) => s + b.accidentes, 0)) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      ))}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                        i === 0 ? 'bg-red-100 text-red-700' :
                        i === 1 ? 'bg-amber-100 text-amber-700' :
                        i === 2 ? 'bg-blue-100 text-blue-700' :
                        'bg-surface-100 text-surface-600'
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-900 truncate">{item.comuna}</p>
                        <div className="flex items-center gap-2 text-2xs text-surface-500">
                          <span>{item.accidentes} incidentes</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-surface-900">{item.accidentes}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body text-center">
              <p className="label">Fuente de datos</p>
              <p className="text-sm text-surface-600">Datos históricos de Medata</p>
              <a href="https://medata.gov.co" target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs mt-2 inline-flex">
                medata.gov.co
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {barData.length > 0 && (
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-surface-900">Accidentes por comuna</h3>
              <p className="text-xs text-surface-500">Top 10 comunas con más incidentes</p>
            </div>
            <div className="card-body">
              <div style={{ height: 250 }}>
                <ResponsiveContainer>
                  <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="comuna" tick={{ fontSize: 10 }} stroke="#64748B" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} />
                    <Bar dataKey="accidentes" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-surface-900">Tendencia temporal</h3>
              <p className="text-xs text-surface-500">Evolución de incidentes en el tiempo</p>
            </div>
            <div className="card-body">
              <div style={{ height: 250 }}>
                <ResponsiveContainer>
                  <LineChart data={lineData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} stroke="#64748B" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#64748B" />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0' }} />
                    <Line type="monotone" dataKey="accidentes" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
