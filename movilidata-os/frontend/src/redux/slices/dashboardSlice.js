import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { apiClient } from '../../services/api'

export const fetchDashboard = createAsyncThunk('dashboard/fetch', async (_, { rejectWithValue }) => {
  try {
    const results = await Promise.allSettled([
      apiClient.get('/api/accidents'),
      apiClient.get('/api/traffic'),
      apiClient.get('/api/weather'),
      apiClient.get('/api/alerts'),
      apiClient.get('/api/prediction')
    ])
    const data = {}
    if (results[0].status === 'fulfilled') data.accidentCount = results[0].value.data.features?.length ?? 0
    else data.accidentCount = 0
    if (results[1].status === 'fulfilled') {
      data.trafficCount = results[1].value.data.segments?.length ?? 0
      data.congestionLevel = results[1].value.data.segments?.filter(s => s.color === 'red').length ?? 0
    } else { data.trafficCount = 0; data.congestionLevel = 0 }
    if (results[2].status === 'fulfilled') data.weather = results[2].value.data
    else data.weather = null
    if (results[3].status === 'fulfilled') data.alertCount = results[3].value.data.alerts?.length ?? 0
    else data.alertCount = 0
    if (results[4].status === 'fulfilled') data.prediction = results[4].value.data
    else data.prediction = null
    const hasErrors = results.some(r => r.status === 'rejected')
    return { ...data, dataFreshness: hasErrors ? 'degraded' : 'ok' }
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

const initialState = {
  data: {
    accidentCount: 0,
    trafficCount: 0,
    congestionLevel: 0,
    weather: null,
    alertCount: 0,
    prediction: null
  },
  loading: false,
  error: null,
  lastUpdate: null,
  dataFreshness: 'ok'
}

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
        state.lastUpdate = new Date().toISOString()
        state.dataFreshness = action.payload.dataFreshness || 'ok'
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
        state.dataFreshness = 'degraded'
      })
  }
})

export default dashboardSlice.reducer
