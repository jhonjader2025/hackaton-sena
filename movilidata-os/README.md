# Movilidata OS — Medellín

**Plataforma Unificada de Movilidad Inteligente**

[![Status](https://img.shields.io/badge/status-MVP-brightgreen)]()
[![HackData](https://img.shields.io/badge/event-HackData%20CTGI%20SENA%202026-blue)]()
[![React](https://img.shields.io/badge/React-18.2-61DAFB)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.95-009688)]()

Monitoreo en tiempo real, predicción de congestión urbana, detección de zonas críticas de accidentalidad, rutas seguras en temporada de lluvias y asistente conversacional con IA para la ciudad de Medellín.

---

## Arquitectura

El sistema sigue una arquitectura de tres capas desacopladas:

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend (PWA)     │────▶│  Backend (API)    │────▶│  Datos externos │
│  React + Vite       │◀────│  FastAPI + SQLite │◀────│  APIs / CSV     │
│  Redux + Tailwind   │     │  APScheduler     │     │  SIATA / SIM    │
│  Leaflet + PWA      │     │  Modelos ML      │     │  Medata / GIS   │
└─────────────────────┘     └──────────────────┘     └─────────────────┘
```

### Capas

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| Presentación | React 18, Vite, Redux Toolkit, Tailwind CSS, Leaflet | PWA con mapas interactivos, dashboards y asistente IA |
| Procesamiento | FastAPI, SQLAlchemy, Pydantic | API REST, ingesta de datos, modelos de ML |
| Datos | SQLite, APScheduler, APIs externas | Almacenamiento local, sincronización periódica |
| PWA | Workbox (VitePWA), Service Worker, Manifest | Instalabilidad, soporte offline, cacheo inteligente |

## Módulos Funcionales

| Módulo | Descripción | Cumple SRS |
|--------|-----------|-----------|
| **Dashboard** | KPIs unificados: accidentes, tráfico, clima, alertas | RF-23 |
| **Zonas Críticas** | Heatmap de accidentalidad con filtros por comuna | RF-01 a RF-06 |
| **Tráfico Tiempo Real** | Monitoreo con colores, alertas y exportación CSV | RF-07 a RF-11 |
| **Predicción** | Modelo de riesgo con horizonte de 2-4h, selectores de fecha/hora | RF-12 a RF-16 |
| **Rutas Seguras** | Cálculo de rutas evitando zonas de alto riesgo + clima | RF-17 a RF-21 |
| **Asistente IA** | Chat conversacional con contexto en tiempo real (OpenAI/Claude) | RF-26 a RF-29 |
| **Alertas** | Historial de 24h con exportación | RF-30 a RF-32 |

## Stack Tecnológico

### Frontend
- **React 18** con **Vite 4** como bundler
- **Redux Toolkit** para manejo de estado global (7 slices)
- **Tailwind CSS 3** con PostCSS para estilos
- **React Leaflet** + **Leaflet.heat** para mapas y heatmaps
- **VitePWA** + **Workbox** para caché y offline
- **Axios** + **DOMPurify** para comunicaciones seguras

### Backend
- **FastAPI** con middleware de seguridad (CORS, TrustedHost)
- **SQLAlchemy** + **SQLite** para persistencia
- **Pydantic** para validación de esquemas
- **APScheduler** para ingesta periódica de datos

### Seguridad
- Variables de entorno para API keys (`.env` gitignored)
- Validación de coordenadas geográficas (rango Medellín)
- Sanitización de inputs con DOMPurify
- Middleware TrustedHost + CORS restrictivo
- Inyección SQL prevenida por ORM

## Instalación Rápida

### Backend

```bash
cd movilidata-os/backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env         # Configurar API keys
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd movilidata-os/frontend
npm install
npm run dev                  # Abre en http://localhost:3000
```

### Docker

```bash
cd movilidata-os
docker-compose up --build
```

## Variables de Entorno (`.env`)

```
GOOGLE_MAPS_API_KEY=tu_key_aqui
ANTHROPIC_API_KEY=tu_key_aqui      # o OPENAI_API_KEY
SIATA_API_KEY=                      # opcional
DATABASE_URL=sqlite:///./movilidata.db
SCHEDULER_INTERVAL_MINUTES=5
```

## API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/accidents` | GET | GeoJSON con puntos de accidente (filtros por query params) |
| `/api/traffic` | GET | Estado actual del tráfico por segmento vial |
| `/api/weather` | GET | Condiciones climáticas actuales (SIATA/mock) |
| `/api/prediction` | GET | Predicción de congestión para fecha y hora |
| `/api/safe-route` | POST | Ruta segura evitando zonas de riesgo |
| `/api/alerts` | GET | Alertas activas del sistema |
| `/api/alerts/history` | GET | Historial de alertas (24h) |
| `/api/assistant` | POST | Consulta al asistente IA con contexto de movilidad |
| `/api/export/{modulo}` | GET | Exportación CSV del módulo indicado |
| `/api/health` | GET | Health check del sistema |

## Licencia

Proyecto académico para HackData CTGI SENA 2026.
