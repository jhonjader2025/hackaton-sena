from fastapi import APIRouter, HTTPException
<<<<<<< HEAD
from pydantic import BaseModel
from typing import List, Optional
from .traffic import traffic_state
from .weather import get_weather
=======
from pydantic import BaseModel, Field, validator
>>>>>>> de62f53b077ab7539ddad844e0e512bd8c37e170
from datetime import datetime
import os, re, requests, json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

router = APIRouter()

<<<<<<< HEAD

# Estructura interna para mapear cada mensaje del historial (RF-28)
class ChatTurn(BaseModel):
    pregunta: str
    respuesta: str


# Modificamos el Request para que acepte el historial desde el frontend (RF-28)
class AssistantRequest(BaseModel):
    pregunta: str
    historial: Optional[List[ChatTurn]] = []
=======
DB_URL = os.getenv('DATABASE_URL', 'sqlite:///./movilidata.db')
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
>>>>>>> de62f53b077ab7539ddad844e0e512bd8c37e170

class AssistantRequest(BaseModel):
    pregunta: str = Field(..., min_length=1, max_length=1000)

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

def build_context():
<<<<<<< HEAD
    weather = get_weather()
    traffic_summary = traffic_state.get("summary", {})
    active_alerts = traffic_state.get("alerts", [])
    return {
        "tráfico": {
            "velocidad_promedio": traffic_summary.get("velocidad_promedio", 0),
            "vias_congestionadas": traffic_summary.get("vias_congestionadas", 0),
            "peores_vias": traffic_summary.get("peores_vias", []),
        },
        "clima": weather,
        "alertas": [a["descripcion"] for a in active_alerts[:3]],
    }
=======
    session = SessionLocal()
    try:
        from models import Accident, SegmentoVial, CondicionClimatica, Alerta, ZonaRiesgo
        acc_count = session.query(Accident).count()
        segments = session.query(SegmentoVial).all()
        weather = session.query(CondicionClimatica).order_by(CondicionClimatica.timestamp.desc()).first()
        active_alerts = session.query(Alerta).filter(Alerta.activa == True).limit(5).all()
        risk_zones = session.query(ZonaRiesgo).order_by(ZonaRiesgo.indice_riesgo.desc()).limit(5).all()
>>>>>>> de62f53b077ab7539ddad844e0e512bd8c37e170

        traffic_info = {'velocidad_promedio': 0, 'vias_congestionadas': 0, 'total_vias': 0}
        if segments:
            speeds = [s.velocidad_actual for s in segments if s.velocidad_actual]
            traffic_info = {
                'velocidad_promedio': round(sum(speeds) / len(speeds), 1) if speeds else 0,
                'vias_congestionadas': sum(1 for s in segments if s.color_congestion == 'red'),
                'total_vias': len(segments)
            }

<<<<<<< HEAD
def build_system_prompt():
    # Reforzamos las instrucciones para cumplir estrictamente con el RF-29 del SRS
    return (
        "Eres 'Evamap IA', un asistente virtual experto y especializado únicamente en la movilidad urbana, "
        "tráfico, clima y accidentalidad de la ciudad de Medellín, Colombia. Responde en un tono claro, "
        "profesional y usando modismos sutiles del español colombiano (como ciudadano/conductor de Medellín). "
        "Usa los datos del contexto actual provistos para enriquecer tus respuestas y cita la fuente cuando sea posible. "
        "No inventes datos viales bajo ninguna circunstancia.\n\n"
        "RESTRICCIÓN CRÍTICA (RF-29): Si el usuario te hace una pregunta que NO está relacionada con la movilidad urbana "
        "de Medellín (por ejemplo: recetas de cocina, desarrollo de software, historia general, etc.), DEBES responder "
        "exactamente y sin excepciones lo siguiente:\n"
        "'Lo siento, mi especialidad es únicamente la movilidad urbana de Medellín. No puedo ayudarte con esa consulta.'"
    )


def call_openai(question, context, historial):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OpenAI API key no configurada")

    endpoint = "https://api.openai.com/v1/chat/completions"

    # Construimos la estructura de mensajes inyectando el historial de la sesión (RF-28)
    messages = [{"role": "system", "content": build_system_prompt()}]

    for turn in historial:
        messages.append({"role": "user", "content": turn.pregunta})
        messages.append({"role": "assistant", "content": turn.respuesta})

    # Añadimos la situación contextual actual y la nueva pregunta
    messages.append(
        {"role": "user", "content": f"Contexto actual del sistema: {context}"}
    )
    messages.append({"role": "user", "content": question})

    # Actualizado a gpt-4o-mini: ideal para responder en menos de 5 segundos (RF-26)
    resp = requests.post(
        endpoint,
        json={
            "model": "gpt-4o-mini",
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 300,
        },
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        timeout=12,
    )

    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()


def call_anthropic(question, context, historial):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("Anthropic API key no configurada")

    # Actualizado a la API moderna de Mensajes de Anthropic (/v1/messages)
    endpoint = "https://api.anthropic.com/v1/messages"

    messages = []
    for turn in historial:
        messages.append({"role": "user", "content": turn.pregunta})
        messages.append({"role": "assistant", "content": turn.respuesta})

    messages.append(
        {
            "role": "user",
            "content": f"Contexto actual del sistema: {context}\n\nPregunta: {question}",
        }
    )

    resp = requests.post(
        endpoint,
        json={
            "model": "claude-3-haiku-20240307",  # El equivalente rápido y óptimo para hackatones
            "system": build_system_prompt(),
            "messages": messages,
            "max_tokens": 300,
            "temperature": 0.3,
        },
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        timeout=12,
    )

    resp.raise_for_status()
    data = resp.json()
    return data["content"][0]["text"].strip()


def fallback_answer(question, context):
    # Si el usuario pregunta algo fuera de contexto y estamos en fallback,
    # hacemos una comprobación básica para mantener el espíritu del RF-29
    palabras_clave = [
        "tráfico",
        "trafico",
        "clima",
        "lluvia",
        "accidente",
        "ruta",
        "vía",
        "via",
        "medellín",
        "medellin",
        "congestión",
    ]
    if not any(palabra in question.lower() for palabra in palabras_clave):
        return "Lo siento, mi especialidad es únicamente la movilidad urbana de Medellín. No puedo ayudarte con esa consulta."

    traffic = context["tráfico"]
    clima = context["clima"]
    alerts = context["alertas"]
    parts = [
        "Actualmente, la velocidad promedio de tráfico estimada es de",
        f"{traffic.get('velocidad_promedio', 0)} km/h.",
        f"Hay {traffic.get('vias_congestionadas', 0)} vías con congestión alta.",
        f"El clima actual indica {clima.get('intensidad_label', 'sin datos')} con {clima.get('precipitacion_mmh', 0)} mm/h.",
    ]
    if alerts:
        parts.append("Alertas activas: " + "; ".join(alerts[:2]) + ".")
    parts.append("(Modo Resiliencia: Mostrando datos locales desconectados de la IA).")
    return " ".join(parts)
=======
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
        'Eres un asistente especializado en movilidad urbana de Medellín, Colombia. '
        'Responde en español colombiano, usa unidades del sistema internacional. '
        'Contexto actual de movilidad: ' + context_str + '. '
        'Cita la fuente de cada dato: Medata para accidentes, SIATA para clima, '
        'SIM para tráfico, Observatorio de Movilidad para estadísticas. '
        'Si la pregunta no está relacionada con movilidad urbana de Medellín, '
        'indica amablemente que tu especialidad es ese dominio. '
        'No inventes datos ni números. Mantén el tono profesional y útil.'
    )

def call_openai(question, context_str):
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise RuntimeError('OpenAI API key no configurada')
    resp = requests.post(
        'https://api.openai.com/v1/chat/completions',
        json={
            'model': 'gpt-3.5-turbo',
            'messages': [
                {'role': 'system', 'content': build_system_prompt(context_str)},
                {'role': 'user', 'content': question}
            ],
            'temperature': 0.2,
            'max_tokens': 300
        },
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
        timeout=15
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
            'max_tokens': 300,
            'system': build_system_prompt(context_str),
            'messages': [{'role': 'user', 'content': question}]
        },
        headers={
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        },
        timeout=15
    )
    resp.raise_for_status()
    data = resp.json()
    return data['content'][0]['text'].strip()

def fallback_answer(question, context):
    r = context['resumen']
    if any(p in question.lower() for p in ['rut', 'segur', 'viaj', 'cómo llegar', 'camino']):
        return (
            f"{r} Para calcular una ruta segura, usa el módulo de Rutas Seguras "
            f"ingresando origen y destino. El sistema evitará zonas de alto riesgo "
            f"considerando el clima actual."
        )
    return r
>>>>>>> de62f53b077ab7539ddad844e0e512bd8c37e170


@router.post("/api/assistant")
def assistant(req: AssistantRequest):
<<<<<<< HEAD
    question = req.pregunta.strip()
    if not question:
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía.")

=======
    question = req.pregunta
>>>>>>> de62f53b077ab7539ddad844e0e512bd8c37e170
    context = build_context()
    context_str = context['resumen']
    try:
<<<<<<< HEAD
        if os.getenv("OPENAI_API_KEY"):
            response = call_openai(question, context, req.historial)
            provider = "OpenAI"
        elif os.getenv("ANTHROPIC_API_KEY"):
            response = call_anthropic(question, context, req.historial)
            provider = "Anthropic"
        else:
            response = fallback_answer(question, context)
            provider = "fallback"
    except Exception as exc:
        response = fallback_answer(question, context)
        provider = "fallback"

    return {
        "pregunta": question,
        "respuesta": response,
        "proveedor": provider,
        "contexto": context,
        "timestamp": datetime.utcnow().isoformat(),
=======
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
        'timestamp': datetime.utcnow().isoformat()
>>>>>>> de62f53b077ab7539ddad844e0e512bd8c37e170
    }
