from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
import os, re, requests, json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

router = APIRouter()

# Configuración de base de datos
DB_URL = os.getenv('DATABASE_URL', 'sqlite:///./movilidata.db')
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

# Modelo para historial de chat
class ChatTurn(BaseModel):
    pregunta: str
    respuesta: str

# Request principal
class AssistantRequest(BaseModel):
    pregunta: str = Field(..., min_length=1, max_length=1000)
    historial: Optional[List[ChatTurn]] = []

    @validator('pregunta')
    def sanitize_question(cls, v):
        dangerous = [
            r'ignore.*instruction', r'forget.*prompt',
            r'system.*prompt', r'execute.*code', r'bypass.*security'
        ]
        for pattern in dangerous:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError('Pregunta contiene patrones no permitidos')
        if not re.match(r"^[a-záéíóúñ0-9\s\?¿\.\,\!\¡\-:;/\@\(\)]+$", v, re.IGNORECASE):
            raise ValueError('Pregunta contiene caracteres no permitidos')
        return v.strip()

# Construcción de contexto desde BD
def build_context():
    session = SessionLocal()
    try:
        from models import Accident, SegmentoVial, CondicionClimatica, Alerta, ZonaRiesgo
        acc_count = session.query(Accident).count()
        segments = session.query(SegmentoVial).all()
        weather = session.query(CondicionClimatica).order_by(CondicionClimatica.timestamp.desc()).first()
        active_alerts = session.query(Alerta).filter(Alerta.activa == True).limit(5).all()
        risk_zones = session.query(ZonaRiesgo).order_by(ZonaRiesgo.indice_riesgo.desc()).limit(5).all()

        traffic_info = {'velocidad_promedio': 0, 'vias_congestionadas': 0, 'total_vias': 0}
        if segments:
            speeds = [s.velocidad_actual for s in segments if s.velocidad_actual]
            traffic_info = {
                'velocidad_promedio': round(sum(speeds) / len(speeds), 1) if speeds else 0,
                'vias_congestionadas': sum(1 for s in segments if s.color_congestion == 'red'),
                'total_vias': len(segments)
            }

        weather_info = {'intensidad': 'sin datos', 'precipitacion': 0}
        if weather:
            weather_info = {'intensidad': weather.intensidad_label, 'precipitacion': weather.precipitacion_mmh}

        alerts_info = [{'tipo': a.tipo, 'sector': a.sector, 'severidad': a.severidad} for a in active_alerts]

        risk_info = []
        for z in risk_zones:
            risk_info.append(f"{z.nombre_sector}: IR {z.indice_riesgo} ({z.n_accidentes} accidentes)")

        return {
            'resumen': (
                f"Medellín tiene {traffic_info['total_vias']} vías monitoreadas, "
                f"velocidad promedio {traffic_info['velocidad_promedio']} km/h, "
                f"{traffic_info['vias_congestionadas']} congestionadas. "
                f"Clima: {weather_info['intensidad']} ({weather_info['precipitacion']} mm/h). "
                f"Accidentes registrados: {acc_count}. "
                f"Alertas activas: {len(alerts_info)}. "
                f"Zonas de mayor riesgo: {'; '.join(risk_info) if risk_info else 'sin datos'}. "
                f"Fuentes: Medata, SIATA, SIM, Observatorio de Movilidad."
            ),
            'accidentes': acc_count,
            'trafico': traffic_info,
            'clima': weather_info,
            'alertas': alerts_info,
            'zonas_riesgo': [z.nombre_sector for z in risk_zones]
        }
    finally:
        session.close()

def build_system_prompt(context_str):
    return (
        "Eres 'Evamap IA', un asistente virtual experto en movilidad urbana de Medellín, Colombia. "
        "Responde en tono claro y profesional, usando modismos sutiles del español colombiano. "
        "Usa los datos del contexto actual provistos para enriquecer tus respuestas y cita la fuente. "
        "Si la pregunta no está relacionada con movilidad urbana de Medellín, responde: "
        "'Lo siento, mi especialidad es únicamente la movilidad urbana de Medellín. No puedo ayudarte con esa consulta.'"
    )

# Llamadas a proveedores IA
def call_openai(question, context_str):
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise RuntimeError('OpenAI API key no configurada')
    resp = requests.post(
        'https://api.openai.com/v1/chat/completions',
        json={
            'model': 'gpt-4o-mini',
            'messages': [
                {'role': 'system', 'content': build_system_prompt(context_str)},
                {'role': 'user', 'content': question}
            ],
            'temperature': 0.3,
            'max_tokens': 300
        },
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
        timeout=12
    )
    resp.raise_for_status()
    data = resp.json()
    return data['choices'][0]['message']['content'].strip()

def call_anthropic(question, context_str):
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        raise RuntimeError('Anthropic API key no configurada')
    resp = requests.post(
        'https://api.anthropic.com/v1/messages',
        json={
            'model': 'claude-3-haiku-20240307',
            'system': build_system_prompt(context_str),
            'messages': [{'role': 'user', 'content': question}],
            'max_tokens': 300,
            'temperature': 0.3
        },
        headers={
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        },
        timeout=12
    )
    resp.raise_for_status()
    data = resp.json()
    return data['content'][0]['text'].strip()

def fallback_answer(question, context):
    return context['resumen']

# Endpoint principal
@router.post("/api/assistant")
def assistant(req: AssistantRequest):
    question = req.pregunta.strip()
    if not question:
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía.")

    context = build_context()
    context_str = context['resumen']
    try:
        if os.getenv('OPENAI_API_KEY'):
            response = call_openai(question, context_str)
            provider = 'OpenAI'
        elif os.getenv('ANTHROPIC_API_KEY'):
            response = call_anthropic(question, context_str)
            provider = 'Anthropic'
        else:
            response = fallback_answer(question, context)
            provider = 'fallback'
    except Exception:
        response = fallback_answer(question, context)
        provider = 'fallback'

    return {
        'pregunta': question,
        'respuesta': response,
        'proveedor': provider,
        'contexto': context,
        'timestamp': datetime.utcnow().isoformat()
    }
