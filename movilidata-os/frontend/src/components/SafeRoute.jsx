import { useState, useEffect } from 'react'
import { sendSafeRoute, getWeather } from '../services/api'
import MapWrapper from './MapComponent'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import { getRainColorByIntensity } from '../constants/colors'

function RoutePolyline({ coordinates, avoidZones }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !coordinates || coordinates.length < 2) return
    const latlngs = coordinates.map((c) => [c[1], c[0]])
    const safeLine = L.polyline(latlngs, {
      color: '#10B981', weight: 5, opacity: 0.8
    }).addTo(map)
    map.fitBounds(safeLine.getBounds().pad(0.3))
    const zoneCoords = {
      'El Poblado': [6.2104, -75.5675], 'Laureles': [6.2434, -75.5908],
      'Centro': [6.2476, -75.5658], 'Belen': [6.2266, -75.5878],
      'Envigado': [6.1690, -75.5878], 'Itagui': [6.1721, -75.6062],
      'Sabaneta': [6.1520, -75.6120], 'Bello': [6.3380, -75.5580]
    }
    const avoidMarkers = (avoidZones || []).map((zone) => {
      const coord = zoneCoords[zone] || [6.2476, -75.5658]
      return L.circle(coord, {
        radius: 500, color: '#EF4444', fillColor: '#FEE2E2', fillOpacity: 0.3, weight: 1
      }).addTo(map).bindPopup(`Zona evitada: ${zone}`)
    })
    return () => {
      map.removeLayer(safeLine)
      avoidMarkers.forEach((m) => map.removeLayer(m))
    }
  }, [map, coordinates, avoidZones])
  return null
}

export default function SafeRoute() {
  const [origen, setOrigen] = useState('6.2445,-75.6012')
  const [destino, setDestino] = useState('6.2603,-75.5772')
  const [route, setRoute] = useState(null)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getWeather().then(setWeather).catch(() => {})
  }, [])

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const [lat1, lon1] = origen.split(',').map(Number)
      const [lat2, lon2] = destino.split(',').map(Number)
      const result = await sendSafeRoute([lat1, lon1], [lat2, lon2])
      setRoute(result)
    } catch (err) {
      setError('No se pudo calcular la ruta segura.')
      setRoute(null)
    } finally { setLoading(false) }
  }

  const routeCoords = route?.routes?.[0]?.geometry?.coordinates
  const avoidZones = route?.metadata?.avoid_zones
  const riskLevels = route?.metadata?.risk_levels

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-surface-900">Rutas Seguras</h2>
        <p className="text-sm text-surface-500">Ruta optimizada evitando zonas de alta siniestralidad</p>
      </div>

      <form onSubmit={submit} className="card p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">
            Origen (lat, lon)
            <input value={origen} onChange={(e) => setOrigen(e.target.value)} className="input mt-1" placeholder="6.2445,-75.6012" aria-label="Coordenadas de origen" />
          </label>
          <label className="label">
            Destino (lat, lon)
            <input value={destino} onChange={(e) => setDestino(e.target.value)} className="input mt-1" placeholder="6.2603,-75.5772" aria-label="Coordenadas de destino" />
          </label>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Calculando...' : 'Calcular ruta segura'}
          </button>
          {error && <span className="text-sm text-red-600" role="alert">{error}</span>}
        </div>
      </form>

      {weather && (
        <div className="card overflow-hidden">
          <div className="flex items-start gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50">
              <svg className="h-5 w-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-surface-500">Condiciones climáticas actuales</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5 text-surface-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getRainColorByIntensity(weather.precipitacion_mmh || 0) }} />
                  Lluvia: {weather.intensidad_label ?? 'N/A'}
                </span>
                <span className="text-surface-500">Precipitación: {weather.precipitacion_mmh ?? '--'} mm/h</span>
                <span className="text-surface-500">Fuente: {weather.fuente ?? 'N/A'}</span>
              </div>
              {weather.recomendacion && (
                <p className="mt-2 text-sm font-medium text-sky-700 bg-sky-50 rounded-md px-3 py-2">{weather.recomendacion}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {route && routeCoords && (
        <div className="space-y-5">
          <div className="overflow-hidden rounded-xl border border-surface-200 shadow-sm">
            <MapWrapper height={420}>
              <RoutePolyline coordinates={routeCoords} avoidZones={avoidZones} />
            </MapWrapper>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-3 w-6 rounded bg-emerald-500" />
                  <span className="text-sm font-medium text-surface-900">Tramo seguro</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-6 rounded bg-red-500" />
                  <span className="text-sm font-medium text-surface-900">Zonas evitadas (alto riesgo)</span>
                </div>
                <p className="mt-3 text-xs text-surface-500">Fuente: {route.metadata?.fuente ?? 'simulado'}</p>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-semibold text-surface-900">Zonas de riesgo evitadas</h3>
              </div>
              <div className="card-body">
                {avoidZones && avoidZones.length > 0 ? (
                  <ul className="space-y-1">
                    {avoidZones.map((zone) => (
                      <li key={zone} className="flex items-center gap-2 text-sm">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${(riskLevels?.[zone] === 'alta') ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <span className="text-surface-700">{zone}</span>
                        <span className="text-2xs text-surface-500">{(riskLevels?.[zone] === 'alta') ? 'Alto riesgo' : 'Riesgo medio'}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-surface-500">Sin zonas de riesgo críticas en la ruta</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
