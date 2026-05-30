from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from .traffic import traffic_state
from .weather import get_weather
from datetime import datetime
import os, requests

router = APIRouter()


# Estructura interna para mapear cada mensaje del historial (RF-28)
class ChatTurn(BaseModel):
    pregunta: str
    respuesta: str


# Modificamos el Request para que acepte el historial desde el frontend (RF-28)
class AssistantRequest(BaseModel):
    pregunta: str
    historial: Optional[List[ChatTurn]] = []


def build_context():
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


@router.post("/api/assistant")
def assistant(req: AssistantRequest):
    question = req.pregunta.strip()
    if not question:
        raise HTTPException(status_code=400, detail="La pregunta no puede estar vacía.")

    context = build_context()
    try:
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
    }
