from fastapi import APIRouter
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import ZonaRiesgo
import os

router = APIRouter()

DB_URL = os.getenv('DATABASE_URL', 'sqlite:///./movilidata.db')
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

@router.get('/api/zonas-riesgo')
def get_zonas_riesgo():
    session = SessionLocal()
    try:
        zonas = session.query(ZonaRiesgo).order_by(ZonaRiesgo.indice_riesgo.desc()).all()
        if not zonas:
            return {
                'zonas': [],
                'total': 0,
                'timestamp': None,
                'metadata': {
                    'fuente': 'Medata / Observatorio de Movilidad',
                    'formula': 'IR = (N_accidentes * 0.5) + (N_victimas * 0.3) + (N_fotomultas * 0.2)',
                    'ultima_actualizacion': None
                }
            }
        return {
            'zonas': [{
                'id': z.id,
                'nombre_sector': z.nombre_sector,
                'comuna': z.comuna,
                'indice_riesgo': z.indice_riesgo,
                'n_accidentes': z.n_accidentes,
                'n_victimas': z.n_victimas,
                'n_fotomultas': z.n_fotomultas,
                'centroide': {'lat': z.centroide_lat, 'lon': z.centroide_lon},
                'nivel': 'crítico' if z.indice_riesgo > 0.7 else
                         'alto' if z.indice_riesgo > 0.5 else
                         'medio' if z.indice_riesgo > 0.3 else 'bajo'
            } for z in zonas],
            'total': len(zonas),
            'timestamp': zonas[0].fecha_calculo.isoformat() if zonas[0].fecha_calculo else None,
            'metadata': {
                'fuente': 'Medata / Observatorio de Movilidad',
                'formula': 'IR = (N_accidentes * 0.5) + (N_victimas * 0.3) + (N_fotomultas * 0.2)',
                'ultima_actualizacion': zonas[0].fecha_calculo.isoformat() if zonas[0].fecha_calculo else None
            }
        }
    finally:
        session.close()
