import { useState, useRef, useEffect } from 'react'
import { sendAssistant } from '../services/api'

const quickQuestions = [
  '¿Cuál es el estado actual del tráfico en Medellín?',
  '¿Dónde hay mayor riesgo de accidentes hoy?',
  '¿Qué alertas activas hay en la ciudad?',
  '¿Cuál es la ruta más segura desde El Poblado hasta Laureles?'
]

export default function Assistant() {
  const [query, setQuery] = useState('')
  const [chat, setChat] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const chatEnd = useRef(null)

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  async function handleSubmit(text) {
    const input = (text || query).trim()
    if (!input) return
    const message = { role: 'user', text: input }
    setChat((c) => [...c, message])
    setQuery(''); setLoading(true); setError('')

    try {
      const response = await sendAssistant(input)
      setChat((c) => [...c, { role: 'assistant', text: response.respuesta || response.message || 'Sin respuesta.' }])
    } catch {
      setError('Error al enviar la consulta. Intenta de nuevo.')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-surface-900">Asistente de movilidad</h2>
        <p className="text-sm text-surface-500">Consulta el estado del tráfico, clima, alertas y rutas seguras</p>
      </div>
      <div className="card">
        <div className="card-body space-y-4">
          {chat.length === 0 && (
            <div className="rounded-lg bg-surface-50 p-4">
              <p className="text-sm font-medium text-surface-700 mb-3">Preguntas rápidas:</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q) => (
                  <button key={q} type="button" onClick={() => handleSubmit(q)} disabled={loading}
                    className="rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-xs text-surface-600 hover:bg-surface-100 hover:text-surface-900 hover:border-surface-300 transition-all disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="space-y-3">
            <textarea
              value={query} onChange={(e) => setQuery(e.target.value)} rows={2}
              placeholder="Ej: ¿Cómo está el tráfico ahora en Medellín?"
              className="input resize-none"
              aria-label="Escribe tu pregunta"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            />
            <div className="flex items-center gap-3">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Consultando...
                  </span>
                ) : 'Enviar'}
              </button>
              {error && <span className="text-sm text-red-600" role="alert">{error}</span>}
            </div>
          </form>
          {chat.length > 0 && (
            <div className="rounded-lg border border-surface-200" role="log" aria-label="Historial de conversación">
              <div className="max-h-96 overflow-y-auto space-y-1 p-2">
                {chat.map((item, index) => (
                  <div key={index} className={`rounded-lg p-4 ${
                    item.role === 'user'
                      ? 'bg-surface-50 border border-surface-200'
                      : 'bg-surface-800 text-white'
                  }`}>
                    <p className={`text-2xs font-semibold uppercase tracking-wider ${
                      item.role === 'user' ? 'text-surface-500' : 'text-surface-400'
                    }`}>
                      {item.role === 'user' ? 'Tú' : 'Asistente'}
                    </p>
                    <p className={`mt-1 whitespace-pre-line text-sm ${
                      item.role === 'user' ? 'text-surface-900' : 'text-white'
                    }`}>
                      {item.text}
                    </p>
                  </div>
                ))}
                <div ref={chatEnd} />
              </div>
            </div>
          )}
          {chat.length > 0 && (
            <p className="text-2xs text-surface-400 text-center">{chat.length} mensajes en esta conversación</p>
          )}
        </div>
      </div>
    </div>
  )
}
