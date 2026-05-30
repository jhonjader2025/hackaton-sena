import os
import pandas as pd
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# 1. Configurar el cliente de la IA
# Asegúrate de tener tu OPENAI_API_KEY en un archivo .env
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 2. Cargar los archivos CSV de la carpeta 'data' automáticamente
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

try:
    df_accidentes = pd.read_csv(os.path.join(DATA_DIR, "accidents_mock.csv"))
    df_trafico = pd.read_csv(os.path.join(DATA_DIR, "traffic_mock.csv"))

    # Generamos un resumen estadístico para darle contexto rápido a la IA sin saturar los tokens
    contexto_datos = f"""
    Estadísticas del tráfico actual en Medellín:
    {df_trafico.describe().to_string()}
    
    Zonas con mayor registro de accidentes en el dataset:
    {df_accidentes['comuna'].value_counts().head(5).to_string() if 'comuna' in df_accidentes.columns else 'Datos de comunas cargados'}
    """
except Exception as e:
    contexto_datos = "Error al cargar los archivos CSV de datos en tiempo real."
    print(f"Error cargando CSVs: {e}")


def consultar_asistente(mensaje_usuario: str, historial: list = []) -> str:
    """
    Procesa la pregunta del usuario utilizando el contexto de los CSV y aplicando las restricciones del SRS.
    """

    # Restricción estricta del prompt del sistema (RF-29 del SRS)
    prompt_sistema = f"""
    Eres 'Evamap IA', un asistente experto en analítica de datos y movilidad urbana exclusivamente para la ciudad de Medellín, Colombia.
    
    Tus respuestas deben basarse estrictamente en temas de movilidad, tráfico, accidentalidad y rutas seguras en Medellín.
    Si el usuario te pregunta algo fuera de este dominio (por ejemplo, recetas de cocina, historia general, programación, etc.), debes responder de manera amable pero firme:
    'Lo siento, mi especialidad es únicamente la movilidad urbana de Medellín. No puedo ayudarte con esa consulta.'
    
    Aquí tienes un resumen de los datos actuales de la plataforma extraídos de los archivos del sistema para responder con precisión contextual (RF-27):
    {contexto_datos}
    
    Responde siempre de manera concisa, clara, y con un tono profesional y servicial para los ciudadanos.
    """

    # Construir la estructura de mensajes incluyendo el historial para mantener la sesión (RF-28)
    messages = [{"role": "system", "content": prompt_sistema}]

    # Agregar el historial existente de la sesión
    for chat in historial:
        messages.append({"role": "user", "content": chat["pregunta"]})
        messages.append({"role": "assistant", "content": chat["respuesta"]})

    # Agregar la nueva pregunta del usuario
    messages.append({"role": "user", "content": mensaje_usuario})

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Modelo rápido y económico ideal para hackatones
            messages=messages,
            temperature=0.5,
            max_tokens=300,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error al conectar con el cerebro de la IA: {str(e)}"
