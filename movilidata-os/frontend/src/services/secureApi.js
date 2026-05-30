import axios from 'axios'
import DOMPurify from 'dompurify'

const API_BASE = import.meta.env.VITE_API_URL || ''

const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Validar entrada de usuario
const validateInput = (value, maxLength = 500) => {
  if (!value) return ''
  if (typeof value !== 'string') return String(value).substring(0, maxLength)
  return DOMPurify.sanitize(value).substring(0, maxLength)
}

// Validar coordenadas
const validateCoordinates = (lat, lon) => {
  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)
  if (isNaN(latNum) || isNaN(lonNum)) throw new Error('Coordenadas inválidas')
  if (latNum < 4.5 || latNum > 6.5 || lonNum < -76 || lonNum > -75) throw new Error('Fuera del área de Medellín')
  return [latNum, lonNum]
}

// Interceptor de respuesta para manejar errores
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 400) {
      console.error('Entrada inválida:', error.response.data)
      throw new Error('Los datos enviados no son válidos')
    }
    if (error.response?.status === 429) {
      throw new Error('Demasiadas solicitudes. Intenta más tarde.')
    }
    if (error.response?.status >= 500) {
      throw new Error('Error del servidor. Mostrando datos en caché.')
    }
    return Promise.reject(error)
  }
)

export { apiClient, validateInput, validateCoordinates }
