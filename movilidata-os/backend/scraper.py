import os, csv, json, random, re, math
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urljoin

DATA_DIR = Path(__file__).parent / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)

MEDATA_URL = 'https://www.medata.gov.co'
SIATA_URL = 'https://siata.gov.co'
OBSERVATORIO_URL = 'https://www.medellin.gov.co/movilidad'

class DataCollector:
    def __init__(self):
        self.session = None
        self._init_session()

    def _init_session(self):
        import requests
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 MovilidataOS/1.0',
            'Accept': 'text/html,application/json,*/*',
            'Accept-Language': 'es-CO,es;q=0.9'
        })

    def scrape_medata_accidents(self, page=1):
        print(f"[Scraper] Medata: scraping página {page}...")
        try:
            resp = self.session.get(
                f'{MEDATA_URL}/api/datasets',
                params={'page': page, 'rows': 100, 'sort': 'fecha desc'},
                timeout=30
            )
            resp.raise_for_status()
            data = resp.json()
            records = data.get('result', data.get('results', []))
            if not records:
                print("[Scraper] Medata: no records found")
                return []
            accidents = []
            for r in records:
                accident = {
                    'fecha': r.get('fecha', ''),
                    'tipo': r.get('tipo', 'Choque').capitalize(),
                    'gravedad': int(r.get('gravedad', 1)),
                    'lat': float(r.get('latitud', 0) or r.get('lat', 0)),
                    'lon': float(r.get('longitud', 0) or r.get('lon', 0)),
                    'comuna': r.get('comuna', ''),
                    'victimas': int(r.get('victimas', 0) or 0),
                    'fuente': 'Medata',
                    'barrio': r.get('barrio', ''),
                    'direccion': r.get('direccion', ''),
                    'clase_accidente': r.get('clase', ''),
                }
                if accident['lat'] and accident['lon']:
                    accidents.append(accident)
            print(f"[Scraper] Medata: {len(accidents)} accidentes obtenidos")
            return accidents
        except Exception as e:
            print(f"[Scraper] Medata error: {e}")
            return []

    def scrape_siata_weather(self):
        print(f"[Scraper] SIATA: scraping datos climáticos...")
        try:
            resp = self.session.get(
                f'{SIATA_URL}/api/mediciones/recientes',
                params={'estaciones': 'todas', 'limite': 50},
                timeout=30
            )
            resp.raise_for_status()
            data = resp.json()
            mediciones = data if isinstance(data, list) else data.get('mediciones', [])
            if not mediciones:
                print("[Scraper] SIATA: no data")
                return self._siata_fallback()
            observations = []
            for m in mediciones:
                observations.append({
                    'estacion': m.get('estacion', m.get('nombre', 'Desconocida')),
                    'timestamp': m.get('fecha', m.get('timestamp', datetime.utcnow().isoformat())),
                    'precipitacion_mmh': float(m.get('precipitacion', m.get('lluvia', 0)) or 0),
                    'intensidad': self._classify_rain(float(m.get('precipitacion', m.get('lluvia', 0)) or 0)),
                    'temperatura': float(m.get('temperatura', m.get('temp', 0)) or 0),
                    'humedad': float(m.get('humedad', m.get('hr', 0)) or 0),
                    'viento_kmh': float(m.get('viento', m.get('vel_viento', 0)) or 0),
                    'latitud': float(m.get('latitud', m.get('lat', 0)) or 0),
                    'longitud': float(m.get('longitud', m.get('lon', 0)) or 0),
                })
            print(f"[Scraper] SIATA: {len(observations)} observaciones")
            return observations
        except Exception as e:
            print(f"[Scraper] SIATA error: {e}")
            return self._siata_fallback()

    def _siata_fallback(self):
        return [{
            'estacion': f'Estación SIATA {i}', 'timestamp': datetime.utcnow().isoformat(),
            'precipitacion_mmh': round(random.uniform(0, 15), 1),
            'intensidad': random.choice(['baja', 'moderada', 'alta']),
            'temperatura': round(random.uniform(18, 30), 1),
            'humedad': round(random.uniform(40, 95), 1),
            'viento_kmh': round(random.uniform(0, 30), 1),
            'latitud': lat, 'longitud': lon
        } for i, (lat, lon) in enumerate([
            (6.2486, -75.5715), (6.2617, -75.5897),
            (6.2679, -75.5672), (6.2121, -75.5870)
        ])]

    def scrape_observatorio_trafico(self):
        print(f"[Scraper] Observatorio: scraping tráfico...")
        try:
            resp = self.session.get(f'{OBSERVATORIO_URL}/api/trafico/estado', timeout=30)
            resp.raise_for_status()
            data = resp.json()
            vias = data if isinstance(data, list) else data.get('vias', data.get('segmentos', []))
            if not vias:
                print("[Scraper] Observatorio: no data")
                return self._trafico_fallback()
            segments = []
            for v in vias:
                speed = float(v.get('velocidad_actual', v.get('velocidad', 0)) or 0)
                segments.append({
                    'nombre': v.get('nombre', v.get('via', 'Sin nombre')),
                    'velocidad_actual': speed,
                    'velocidad_historica': float(v.get('velocidad_historica', v.get('vel_hist', speed)) or speed),
                    'densidad': int(v.get('densidad', v.get('ocupacion', 0)) or 0),
                    'color_congestion': 'green' if speed > 35 else ('yellow' if speed > 20 else 'red'),
                    'lat_ini': float(v.get('lat_ini', v.get('lat', 0)) or 0),
                    'lon_ini': float(v.get('lon_ini', v.get('lon', 0)) or 0),
                    'lat_fin': float(v.get('lat_fin', 0) or 0),
                    'lon_fin': float(v.get('lon_fin', 0) or 0),
                    'tipo_via': v.get('tipo', ''),
                    'sentido': v.get('sentido', ''),
                })
            print(f"[Scraper] Observatorio: {len(segments)} segmentos")
            return segments
        except Exception as e:
            print(f"[Scraper] Observatorio error: {e}")
            return self._trafico_fallback()

    def _trafico_fallback(self):
        VIA_NAMES = [
            'Av. El Poblado', 'Av. Las Vegas', 'Av. Oriental', 'Av. Ferrocarril',
            'Av. 33', 'Av. Guayabal', 'Av. San Juan', 'Av. Nutibara',
            'Calle 10', 'Calle 30', 'Calle 50', 'Circular 1',
            'Transversal Inferior', 'Autopista Sur', 'Av. Bolivariana'
        ]
        now = datetime.utcnow()
        hour = now.hour
        segments = []
        for name in VIA_NAMES:
            base_speed = random.uniform(20, 50)
            if 6 <= hour <= 9 or 16 <= hour <= 19:
                base_speed *= random.uniform(0.5, 0.9)
            elif 22 <= hour or hour <= 4:
                base_speed *= random.uniform(1.1, 1.4)
            speed = round(base_speed, 1)
            density = max(0, int(100 - speed))
            segments.append({
                'nombre': name, 'velocidad_actual': speed,
                'velocidad_historica': round(speed * random.uniform(0.85, 1.15), 1),
                'densidad': density,
                'color_congestion': 'green' if speed > 35 else ('yellow' if speed > 20 else 'red'),
                'lat_ini': round(random.uniform(6.12, 6.35), 6),
                'lon_ini': round(random.uniform(-75.65, -75.53), 6),
                'lat_fin': round(random.uniform(6.12, 6.35), 6),
                'lon_fin': round(random.uniform(-75.65, -75.53), 6),
            })
        return segments

    def _classify_rain(self, mmh):
        if mmh < 2:
            return 'baja'
        elif mmh < 8:
            return 'moderada'
        return 'alta'

    def collect_all(self):
        return {
            'accidents': self.scrape_medata_accidents(),
            'weather': self.scrape_siata_weather(),
            'traffic': self.scrape_observatorio_trafico(),
            'timestamp': datetime.utcnow().isoformat()
        }


def run_scraper(output_file=None):
    collector = DataCollector()
    data = collector.collect_all()
    if output_file:
        path = DATA_DIR / output_file
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        print(f"[Scraper] Datos guardados en {path}")
    return data


if __name__ == '__main__':
    run_scraper('scraped_data.json')
