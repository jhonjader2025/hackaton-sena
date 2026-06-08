# hackaton-sena

# 🚦 Proyecto Hackaton SENA - Moviladata

## 📌 Contexto
Este sistema fue desarrollado para el concurso de programación del SENA en Medellín.  
El reto principal era **predecir y mitigar el problema de las vías inundadas durante la lluvia**, ofreciendo rutas más seguras y eficientes para los ciudadanos.

## 🧠 Descripción del sistema
El sistema es un **mapa de navegación inteligente** que:
- Sugiere **rutas más seguras** utilizando algoritmos de inteligencia artificial.
- Marca en el mapa:
  - Pronóstico de lluvia en tiempo real.
  - Nivel de congestión de las vías.
  - Accidentes ocurridos en Medellín durante los últimos 3 años.
- Predice qué vías pueden inundarse cuando llueve y recomienda alternativas de tránsito.

## 🛠️ Tecnologías utilizadas
- **Frontend:** Leaflet.js / Mapbox GL JS para mapas interactivos.
- **Backend:** Node.js + Express / Python FastAPI para procesamiento de datos.
- **Base de datos:** PostgreSQL + PostGIS para almacenamiento geoespacial.
- **APIs externas:**
  - OpenWeatherMap (clima y pronósticos).
  - HERE Traffic API (congestión en tiempo real).
  - Datos históricos de accidentes en Medellín.

## 🚀 Instalación y ejecución
1. Clonar el repositorio:
   ```bash
   git clone https://github.com/jhonjader2025/hackaton-sena.git
