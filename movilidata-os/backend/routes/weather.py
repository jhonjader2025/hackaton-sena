from fastapi import APIRouter, HTTPException
from datetime import datetime
import os
import requests
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

router = APIRouter()

DB_URL = os.getenv('DATABASE_URL', 'sqlite:///./movilidata.db')
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

SIATA_API_URL = os.getenv('SIATA_API_URL', 'https://siata.gov.co/api/mediciones/recientes')
SIATA_API_KEY = os.getenv('SIATA_API_KEY', '')

ESTACIONES = [
    {'nombre': 'Museo de Agua', 'lat': 6.2486, 'lon': -75.5715},
    {'nombre': 'Politécnico', 'lat': 6.2617, 'lon': -75.5897},
    {'nombre': 'UdeA', 'lat': 6.2679, 'lon': -75.5672},
    {'nombre': 'ITM', 'lat': 6.2121, 'lon': -75.5870},
]

def _classify_rain(mmh):
    if mmh < 2: return 'baja'
    if mmh < 8: return 'moderada'
    return 'alta'

@router.get('/api/weather')
def get_weather():
    now = datetime.utcnow().isoformat()

    # 1. Try SIATA API
    if SIATA_API_KEY:
        try:
            params = {'api_key': SIATA_API_KEY, 'estaciones': 'todas', 'limite': 10}
            r = requests.get(SIATA_API_URL, params=params, timeout=8)
            if r.ok:
                data = r.json()
                mediciones = data if isinstance(data, list) else data.get('mediciones', [])
                if mediciones:
                    m = mediciones[0]
                    mmh = float(m.get('precipitacion', m.get('lluvia', 0)) or 0)
                    return {
                        'timestamp': now,
                        'estaciones': [{
                            'nombre': e.get('estacion', e.get('nombre', f'Estación {i}')),
                            'precipitacion_mmh': float(e.get('precipitacion', e.get('lluvia', 0)) or 0),
                            'intensidad': _classify_rain(float(e.get('precipitacion', e.get('lluvia', 0)) or 0)),
                            'temperatura': float(e.get('temperatura', e.get('temp', 0)) or 0),
                            'humedad': float(e.get('humedad', e.get('hr', 0)) or 0),
                            'latitud': float(e.get('latitud', e.get('lat', 0)) or 0),
                            'longitud': float(e.get('longitud', e.get('lon', 0)) or 0),
                        } for i, e in enumerate(mediciones)],
                        'precipitacion_mmh': mmh,
                        'intensidad_label': _classify_rain(mmh),
                        'fuente': 'SIATA',
                        'source_status': 'ok',
                        'actualizacion': datetime.utcnow().isoformat()
                    }
        except Exception as e:
            print(f"[Weather] SIATA error: {e}")

    # 2. Try database (scraper may have stored data)
    try:
        from models import CondicionClimatica
        session = SessionLocal()
        try:
            latest = session.query(CondicionClimatica).order_by(CondicionClimatica.timestamp.desc()).first()
            if latest:
                return {
                    'timestamp': now,
                    'precipitacion_mmh': latest.precipitacion_mmh,
                    'intensidad_label': latest.intensidad_label or _classify_rain(latest.precipitacion_mmh),
                    'estacion': latest.estacion_siata,
                    'temperatura': latest.temperature,
                    'fuente': 'SIATA (caché DB)',
                    'source_status': 'degraded',
                    'actualizacion': latest.timestamp.isoformat() if hasattr(latest.timestamp, 'isoformat') else str(latest.timestamp)
                }
        finally:
            session.close()
    except Exception:
        pass

    # 3. Return clear unavailable status — no mock
    return {
        'timestamp': now,
        'precipitacion_mmh': None,
        'intensidad_label': None,
        'fuente': 'No disponible',
        'source_status': 'unavailable',
        'mensaje': 'Datos climáticos no disponibles en este momento. Verifica la conexión con SIATA o la configuración de SIATA_API_KEY.',
        'actualizacion': None
    }
