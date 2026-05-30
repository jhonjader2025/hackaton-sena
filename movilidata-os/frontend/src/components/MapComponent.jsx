import { MapContainer, TileLayer } from 'react-leaflet'
import { useSelector } from 'react-redux'
import 'leaflet/dist/leaflet.css'

export default function MapWrapper({ children, center=[6.25,-75.57], zoom=12, height=400 }){
  const darkMode = useSelector((state) => state.ui.darkMode)
  const tileUrl = darkMode
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  const attribution = darkMode
    ? '&copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://openstreetmap.org/copyright">OSM</a>'

  return (
    <MapContainer center={center} zoom={zoom} style={{height: `${height}px`, width: '100%'}}>
      <TileLayer key={tileUrl} url={tileUrl} attribution={attribution} />
      {children}
    </MapContainer>
  )
}
