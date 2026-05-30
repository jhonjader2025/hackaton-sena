import { apiClient, validateInput, validateCoordinates } from './secureApi'

function handleResponse(response) {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

export async function getAccidents(params = {}) {
  const search = new URLSearchParams(params).toString()
  const resp = await fetch(`/api/accidents${search ? `?${search}` : ''}`)
  return handleResponse(resp)
}

export async function getTraffic() {
  const resp = await fetch('/api/traffic')
  return handleResponse(resp)
}

export async function getWeather() {
  const resp = await fetch('/api/weather')
  return handleResponse(resp)
}

export async function getPrediction(fecha, hora) {
  const params = new URLSearchParams()
  if (fecha) params.set('fecha', fecha)
  if (hora !== undefined) params.set('hora', hora)
  const resp = await fetch(`/api/prediction?${params.toString()}`)
  return handleResponse(resp)
}

export async function sendSafeRoute(origen, destino) {
  const [lat1, lon1] = validateCoordinates(origen[0], origen[1])
  const [lat2, lon2] = validateCoordinates(destino[0], destino[1])
  const resp = await fetch('/api/safe-route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origen: [lat1, lon1], destino: [lat2, lon2] })
  })
  return handleResponse(resp)
}

export async function sendAssistant(pregunta) {
  const sanitized = validateInput(pregunta)
  const resp = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pregunta: sanitized })
  })
  return handleResponse(resp)
}

export async function getAlerts() {
  const resp = await fetch('/api/alerts')
  return handleResponse(resp)
}

export async function getAlertsHistory() {
  const resp = await fetch('/api/alerts/history')
  return handleResponse(resp)
}

export async function exportModule(modulo) {
  const resp = await fetch(`/api/export/${modulo}`)
  if (!resp.ok) throw new Error('No se pudo exportar')
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${modulo}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export { apiClient }

// src/services/assistantService.js

const API_URL = "http://localhost:8000/api/assistant"; // Ajusta el puerto si tu backend corre en otro

/**
 * Envía la pregunta del usuario al asistente de IA en el backend.
 * @param {string} pregunta - La consulta del ciudadano.
 * @param {Array} historial - El arreglo con los mensajes previos [{pregunta, respuesta}].
 */
export const enviarPreguntaAsistente = async (pregunta, historial = []) => {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pregunta: pregunta,
        historial: historial, // Mantiene el hilo de la conversación (RF-28)
      }),
    });

    if (!response.ok) {
      throw new Error("Error en la respuesta del servidor de Evamaps");
    }

    return await response.json();
  } catch (error) {
    console.error("Error en enviarPreguntaAsistente:", error);
    // Retornamos un formato idéntico en caso de fallo para que la UI no se rompa
    return {
      respuesta: "Lo siento, hubo un problema de conexión con el servidor local. Por favor, intenta de nuevo.",
      proveedor: "error"
    };
  }
};