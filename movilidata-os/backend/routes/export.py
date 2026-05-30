import os, csv
from io import StringIO
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .traffic import traffic_state, get_active_alerts
from models import Accident
from .prediction import get_prediction

router = APIRouter()

DB_URL = os.getenv('DATABASE_URL', 'sqlite:///./movilidata.db')
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

@router.get('/api/export/{modulo}')
def export_module(modulo: str):
    modulo = modulo.lower()
    output = StringIO()
    writer = csv.writer(output)

    if modulo == 'accidents' or modulo == 'accidentes':
        session = SessionLocal()
        try:
            rows = session.query(Accident).all()
            writer.writerow(['id', 'fecha', 'tipo', 'gravedad', 'comuna', 'victimas', 'fuente', 'lon', 'lat'])
            for item in rows:
                writer.writerow([
                    item.id,
                    item.fecha,
                    item.tipo,
                    item.gravedad,
                    item.comuna,
                    item.victimas,
                    item.fuente,
                    item.lon,
                    item.lat
                ])
        finally:
            session.close()
        output.seek(0)
        return StreamingResponse(output, media_type='text/csv', headers={
            'Content-Disposition': 'attachment; filename="accidentes.csv"'
        })

    if modulo == 'traffic' or modulo == 'trafico':
        writer.writerow(['id', 'nombre', 'velocidad', 'densidad', 'color'])
        for segment in traffic_state.get('segments', []):
            writer.writerow([
                segment.get('id'),
                segment.get('name'),
                segment.get('velocidad'),
                segment.get('densidad'),
                segment.get('color')
            ])
        output.seek(0)
        return StreamingResponse(output, media_type='text/csv', headers={
            'Content-Disposition': 'attachment; filename="trafico.csv"'
        })

    if modulo == 'alerts' or modulo == 'alertas':
        alerts = get_active_alerts()
        writer.writerow(['id', 'timestamp', 'tipo', 'modulo_origen', 'sector', 'severidad', 'descripcion', 'activa'])
        for alert in alerts:
            writer.writerow([
                alert.get('id'),
                alert.get('timestamp'),
                alert.get('tipo'),
                alert.get('modulo_origen'),
                alert.get('sector'),
                alert.get('severidad'),
                alert.get('descripcion'),
                alert.get('activa')
            ])
        output.seek(0)
        return StreamingResponse(output, media_type='text/csv', headers={
            'Content-Disposition': 'attachment; filename="alertas.csv"'
        })

    if modulo == 'prediction' or modulo == 'predictions' or modulo == 'prediccion':
        prediction = get_prediction()
        writer.writerow(['tipo', 'hora', 'valor'])
        for item in prediction.get('series', {}).get('historico', []):
            writer.writerow(['historico', item.get('hora'), item.get('valor')])
        for item in prediction.get('series', {}).get('pronostico', []):
            writer.writerow(['pronostico', item.get('hora'), item.get('probabilidad')])
        output.seek(0)
        return StreamingResponse(output, media_type='text/csv', headers={
            'Content-Disposition': 'attachment; filename="prediccion.csv"'
        })

    raise HTTPException(status_code=404, detail='Módulo no soportado para exportación')
