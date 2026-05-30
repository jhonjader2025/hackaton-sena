import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiClient } from '../../services/api'

export const fetchAlerts = createAsyncThunk('alerts/fetch', async (_, { rejectWithValue }) => {
  try {
    const response = await apiClient.get('/api/alerts')
    return response.data
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

export const fetchAlertsHistory = createAsyncThunk('alerts/fetchHistory', async (_, { rejectWithValue }) => {
  try {
    const response = await apiClient.get('/api/alerts/history')
    return response.data
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

const initialState = {
  active: [],
  history: [],
  loading: false,
  error: null,
  count: 0
}

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAlerts.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAlerts.fulfilled, (state, action) => {
        state.loading = false
        state.active = action.payload.alerts || []
        state.count = action.payload.count || 0
      })
      .addCase(fetchAlerts.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(fetchAlertsHistory.pending, (state) => { state.loading = true })
      .addCase(fetchAlertsHistory.fulfilled, (state, action) => {
        state.loading = false
        state.history = action.payload.history || []
      })
      .addCase(fetchAlertsHistory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  }
})

export default alertsSlice.reducer
