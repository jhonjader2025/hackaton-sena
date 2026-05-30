import { useState } from 'react'

const LAYERS = [
  { id: 'accidents', label: 'Accidentalidad', color: 'bg-red-500', default: true },
  { id: 'traffic', label: 'Tráfico en vivo', color: 'bg-amber-500', default: true },
  { id: 'prediction', label: 'Predicción congestión', color: 'bg-blue-500', default: false },
  { id: 'weather', label: 'Condiciones climáticas', color: 'bg-sky-500', default: false },
  { id: 'risk_zones', label: 'Zonas de riesgo', color: 'bg-purple-500', default: true },
]

export default function LayerControl({ activeLayers, onToggle }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="absolute bottom-4 right-4 z-[1000]">
      <div className="rounded-xl border border-surface-200 bg-white shadow-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center gap-2 px-4 py-2.5 text-xs font-semibold text-surface-600 hover:bg-surface-50 transition-colors"
          aria-label={collapsed ? 'Mostrar capas' : 'Ocultar capas'}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Capas
          <svg className={`h-3 w-3 ml-auto transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {!collapsed && (
          <div className="border-t border-surface-200 p-3 space-y-2 min-w-[180px]">
            {LAYERS.map((layer) => (
              <label key={layer.id} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={activeLayers[layer.id] ?? layer.default}
                  onChange={() => onToggle(layer.id)}
                  className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                  aria-label={`Mostrar capa: ${layer.label}`}
                />
                <span className={`h-2.5 w-2.5 rounded-full ${layer.color} shrink-0`} />
                <span className="text-xs font-medium text-surface-600 group-hover:text-surface-900 transition-colors">
                  {layer.label}
                </span>
              </label>
            ))}
            <div className="pt-2 mt-2 border-t border-surface-100">
              <p className="text-2xs text-surface-400">
                <a href="https://medata.gov.co" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-600">Medata</a>
                {' · '}
                <a href="https://siata.gov.co" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-600">SIATA</a>
                {' · '}
                <a href="https://medellin.gov.co/sim" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-600">SIM</a>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
