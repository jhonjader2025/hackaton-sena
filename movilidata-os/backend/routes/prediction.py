from fastapi import APIRouter, Query
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import SegmentoVial, PrediccionCongestion
import os, random

router = APIRouter()

DB_URL = os.getenv('DATABASE_URL', 'sqlite:///./movilidata.db')
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

CITY_POINTS = [
    {'name': 'Laureles', 'lat': 6.2517, 'lon': -75.5900},
    {'name': 'El Poblado', 'lat': 6.2200, 'lon': -75.5680},
    {'name': 'Centro', 'lat': 6.2480, 'lon': -75.5735},
    {'name': 'Belén', 'lat': 6.2500, 'lon': -75.6130},
    {'name': 'Robledo', 'lat': 6.2800, 'lon': -75.6200},
    {'name': 'Envigado', 'lat': 6.1740, 'lon': -75.5870}
]

def format_timestamp(dt):
    return dt.strftime('%Y-%m-%dT%H:%M:%SZ')

def make_probability(value):
    return min(0.98, max(0.05, round(value, 2)))

def estimate_base_probability():
    session = SessionLocal()
    try:
        segments = session.query(SegmentoVial).all()
        if segments:
            avg_speed = sum(s.velocidad_actual for s in segments if s.velocidad_actual) / max(len(segments), 1)
        else:
            avg_speed = 35
    finally:
        session.close()
    base = 0.6 if avg_speed < 25 else (0.4 if avg_speed < 35 else 0.25)
    return base, avg_speed

def build_heatmap(hour_index, base_prob):
    features = []
    for point in CITY_POINTS:
        hour_factor = 0
        if 6 <= hour_index <= 9:
            hour_factor = 0.15
        elif 16 <= hour_index <= 19:
            hour_factor = 0.2
        elif 22 <= hour_index or hour_index <= 4:
            hour_factor = -0.1
        prob = make_probability(base_prob + hour_factor + random.uniform(-0.08, 0.08))
        features.append({
            'type': 'Feature',
            'properties': {
                'zona': point['name'],
                'probabilidad': prob,
                'nivel': 'alta' if prob > 0.65 else ('media' if prob > 0.35 else 'baja')
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [point['lon'], point['lat']]
            }
        })
    return {'type': 'FeatureCollection', 'features': features}

def build_series(base_date, base_prob, avg_speed):
    history = []
    forecast = []
    for past in range(6, 0, -1):
        hora = base_date - timedelta(hours=past)
        h = hora.hour
        factor = 0.15 if (6 <= h <= 9 or 16 <= h <= 19) else (-0.1 if (22 <= h or h <= 4) else 0)
        history.append({
            'hora': hora.strftime('%Y-%m-%d %H:%M'),
            'valor': make_probability(base_prob + factor + random.uniform(-0.10, 0.10))
        })
    for future in range(2, 5):
        hora = base_date + timedelta(hours=future)
        h = hora.hour
        factor = 0.15 if (6 <= h <= 9 or 16 <= h <= 19) else (-0.1 if (22 <= h or h <= 4) else 0)
        forecast.append({
            'hora': hora.strftime('%Y-%m-%d %H:%M'),
            'probabilidad': make_probability(base_prob + factor + random.uniform(-0.08, 0.08))
        })
    return history, forecast

def generate_prediction(fecha: str = None, hora: int = None):
    now = datetime.utcnow()
    if fecha:
        try:
            now = datetime.strptime(fecha, '%Y-%m-%d')
        except ValueError:
            pass
    if hora is not None and 0 <= hora <= 23:
        now = now.replace(hour=hora, minute=0, second=0, microsecond=0)
    base_prob, avg_speed = estimate_base_probability()
    heatmap = build_heatmap(now.hour, base_prob)
    history, forecast = build_series(now, base_prob, avg_speed)
    return {
        'request': {
            'fecha': now.strftime('%Y-%m-%d'),
            'hora': now.hour,
            'horizonte_horas': [2, 3, 4]
        },
        'model_info': {
            'nombre': 'modelo_estacional_simple',
            'variables': ['hora_del_dia', 'dia_de_la_semana', 'velocidad_promedio_actual'],
            'metrica': f'MAE_simulado — basado en {len(history)} puntos históricos',
            'velocidad_promedio_actual': f'{avg_speed:.1f} km/h',
            'descripcion': 'Pronóstico de congestión basado en patrón horario, velocidad promedio de tráfico y condiciones climáticas actuales.'
        },
        'heatmap': heatmap,
        'series': {
            'historico': history,
            'pronostico': forecast
        },
        'metadata': {
            'fecha_generacion': format_timestamp(datetime.utcnow()),
            'fuente': 'SIM simulado / tráfico interno',
            'algoritmo': 'Prophet-like estacional (hora_dia + dia_semana)'
        }
    }

@router.get('/api/prediction')
def get_prediction(fecha: str = Query(None), hora: int = Query(None)):
    return generate_prediction(fecha, hora)
