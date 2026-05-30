import os
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from models import Accident
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from pathlib import Path
import csv, json

router = APIRouter()

DB_URL = os.getenv('DATABASE_URL', 'sqlite:///./movilidata.db')
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get('/api/accidents')
def get_accidents(
    q: str = Query(None, description='Búsqueda textual (comuna, tipo, descripción)'),
    limit: int = Query(None, description='Máximo de resultados', ge=1, le=10000),
    offset: int = Query(0, description='Desplazamiento', ge=0),
    fecha_inicio: str = Query(None, description='Filtro fecha inicio (YYYY-MM-DD)'),
    fecha_fin: str = Query(None, description='Filtro fecha fin (YYYY-MM-DD)'),
    comuna: str = Query(None, description='Filtrar por comuna'),
    tipo: str = Query(None, description='Filtrar por tipo de accidente'),
    db: Session = Depends(get_db)
):
    query = db.query(Accident)

    if q:
        search = f'%{q}%'
        query = query.filter(
            Accident.comuna.ilike(search) |
            Accident.tipo.ilike(search) |
            Accident.fuente.ilike(search)
        )
    if fecha_inicio:
        query = query.filter(Accident.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.filter(Accident.fecha <= fecha_fin)
    if comuna:
        query = query.filter(Accident.comuna.ilike(f'%{comuna}%'))
    if tipo:
        query = query.filter(Accident.tipo.ilike(f'%{tipo}%'))

    total = query.count()

    query = query.order_by(Accident.fecha.desc()).offset(offset)
    if limit:
        query = query.limit(limit)
    else:
        query = query.limit(10000)

    rows = query.all()
    features = []
    for r in rows:
        features.append({
            'type': 'Feature',
            'properties': {
                'id': r.id,
                'fecha': r.fecha,
                'tipo': r.tipo,
                'gravedad': r.gravedad,
                'comuna': r.comuna,
                'victimas': r.victimas,
                'fuente': r.fuente,
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [r.lon, r.lat]
            }
        })
    return {
        'type': 'FeatureCollection',
        'features': features,
        'total': total,
        'offset': offset,
        'returned': len(features)
    }
