from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import os, requests, math, random
from pathlib import Path
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

router = APIRouter()

DB_URL = os.getenv('DATABASE_URL', 'sqlite:///./movilidata.db')
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

class Coordinates(BaseModel):
    lat: float = Field(..., ge=4.5, le=6.5)
    lon: float = Field(..., ge=-76, le=-75)

    @validator('lat', 'lon')
    def validate_coordinates(cls, v):
        if not isinstance(v, (int, float)):
            raise ValueError('Coordenada debe ser numérica')
        return float(v)

class RouteRequest(BaseModel):
    origen: List[float] = Field(..., min_items=2, max_items=2)
    destino: List[float] = Field(..., min_items=2, max_items=2)

    @validator('origen', 'destino', pre=True)
    def validate_coords(cls, v):
        if not isinstance(v, list) or len(v) != 2:
            raise ValueError('Origen/destino deben ser [lat, lon]')
        lat, lon = v
        if not (4.5 <= lat <= 6.5 and -76 <= lon <= -75):
            raise ValueError('Coordenadas fuera del área de Medellín')
        return v

def distance(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])

def get_weather_factor():
    from models import CondicionClimatica
    session = SessionLocal()
    try:
        latest = session.query(CondicionClimatica).order_by(CondicionClimatica.timestamp.desc()).first()
        if latest:
            intensidad = 0
            if latest.intensidad_label == 'alta':
                intensidad = 1.0
            elif latest.intensidad_label == 'moderada':
                intensidad = 0.5
            elif latest.precipitacion_mmh > 0:
                intensidad = min(latest.precipitacion_mmh / 20, 1.0)
            return {'factor': intensidad, 'precipitacion': latest.precipitacion_mmh, 'intensidad': latest.intensidad_label}
        return {'factor': 0.0, 'precipitacion': 0, 'intensidad': 'baja'}
    finally:
        session.close()

def get_risk_zones():
    from models import ZonaRiesgo, CondicionClimatica
    session = SessionLocal()
    try:
        zonas = session.query(ZonaRiesgo).order_by(ZonaRiesgo.indice_riesgo.desc()).all()
        weather = session.query(CondicionClimatica).order_by(CondicionClimatica.timestamp.desc()).first()
        coef_lluvia = 0.5
        intensidad_norm = 0
        if weather and weather.precipitacion_mmh > 0:
            intensidad_norm = min(weather.precipitacion_mmh / 20, 1.0)
        result = []
        for z in zonas:
            ir_lluvia = z.indice_riesgo * (1 + coef_lluvia * intensidad_norm)
            level = 'crítico' if ir_lluvia > 0.7 else 'alta' if ir_lluvia > 0.5 else 'media' if ir_lluvia > 0.3 else 'baja'
            result.append({
                'name': z.nombre_sector,
                'indice_riesgo': z.indice_riesgo,
                'ir_lluvia': round(ir_lluvia, 4),
                'risk_level': 'alta' if ir_lluvia > 0.5 else 'media',
                'lat': z.centroide_lat or (6.24 + random.uniform(-0.05, 0.05)),
                'lon': z.centroide_lon or (-75.58 + random.uniform(-0.05, 0.05)),
            })
        return result
    finally:
        session.close()

@router.post('/api/safe-route')
def safe_route(req: RouteRequest):
    try:
        origin = req.origen
        dest = req.destino
        gkey = os.getenv('GOOGLE_MAPS_API_KEY')
        weather = get_weather_factor()

        if gkey:
            try:
                params = {
                    'origin': f"{origin[0]},{origin[1]}",
                    'destination': f"{dest[0]},{dest[1]}",
                    'key': gkey,
                    'alternatives': 'true'
                }
                r = requests.get('https://maps.googleapis.com/maps/api/directions/json',
                               params=params, timeout=8)
                if r.ok and r.json().get('routes'):
                    data = r.json()
                    data['weather_factor'] = weather
                    data['metadata'] = {
                        'fuente': 'Google Maps + SIATA',
                        'avoid_zones': [],
                        'risk_levels': {},
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    return data
            except Exception:
                pass

        risk_zones = get_risk_zones()
        centroids = risk_zones

        route = [[origin[1], origin[0]]]
        mid = [(origin[0] + dest[0]) / 2, (origin[1] + dest[1]) / 2]

        offset = 0.0
        for c in centroids:
            c_lat, c_lon = c['lat'], c['lon']
            if c_lat and c_lon and distance([c_lat, c_lon], mid) < 0.025:
                offset = max(offset, 0.025)

        if offset:
            mid = [mid[0] + offset, mid[1] - offset]

        route.append([mid[1], mid[0]])
        route.append([dest[1], dest[0]])

        return {
            'status': 'OK',
            'routes': [{
                'geometry': {
                    'coordinates': route
                },
                'legs': [{
                    'distance': {'value': 0},
                    'duration': {'value': 0}
                }]
            }],
            'weather_factor': weather,
            'metadata': {
                'avoid_zones': [c['name'] for c in centroids if c.get('risk_level') == 'alta'],
                'risk_levels': {c['name']: c['risk_level'] for c in centroids if c.get('name')},
                'ir_lluvia': {c['name']: c.get('ir_lluvia', 0) for c in centroids if c.get('name')},
                'fuente': 'simulado + SIATA',
                'timestamp': datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
