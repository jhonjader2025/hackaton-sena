import { createSlice } from '@reduxjs/toolkit'

function getStored(key, fallback) {
  try { return localStorage.getItem(key) } catch { return null }
}

function getInitialDarkMode() {
  const stored = getStored('movilidata-darkMode')
  if (stored !== null) return stored === 'true'
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return true
  return false
}

const initialState = {
  activeTab: getStored('movilidata-activeTab') || 'dashboard',
  offlineMode: false,
  darkMode: getInitialDarkMode(),
  sidebarOpen: false,
  notifications: []
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload
      localStorage.setItem('movilidata-activeTab', action.payload)
    },
    setOfflineMode: (state, action) => { state.offlineMode = action.payload },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode
      localStorage.setItem('movilidata-darkMode', state.darkMode)
    },
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen },
    addNotification: (state, action) => {
      const id = Date.now()
      state.notifications.push({ id, ...action.payload })
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },
    clearNotifications: (state) => {
      state.notifications = []
    }
  }
})

export const { setActiveTab, setOfflineMode, toggleDarkMode, toggleSidebar, addNotification, removeNotification, clearNotifications } = uiSlice.actions
export default uiSlice.reducer
