import os
import csv
import random
import math
from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy.orm import Session

DATA_DIR = Path(__file__).parent / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)
ACC_FILE = DATA_DIR / 'accidents_sample.csv'

COMUNAS = [
    'Comuna 1', 'Comuna 2', 'Comuna 3', 'Comuna 4', 'Comuna 5',
    'Comuna 6', 'Comuna 7', 'Comuna 8', 'Comuna 9', 'Comuna 10',
    'El Poblado', 'Laureles', 'Belen', 'Centro', 'Robledo'
]

MIN_LAT, MAX_LAT = 6.12, 6.35
MIN_LON, MAX_LON = -75.65, -75.53

VIA_NAMES = [
    'Av. El Poblado', 'Av. Las Vegas', 'Av. Oriental', 'Av. Ferrocarril',
    'Av. 33', 'Av. Guayabal', 'Av. San Juan', 'Av. Nutibara',
    'Calle 10', 'Calle 30', 'Calle 50', 'Circular 1',
    'Transversal Inferior', 'Autopista Sur', 'Av. Bolivariana'
]

ESTACIONES_SIATA = [
    {'nombre': 'Estación Museo de Agua', 'lat': 6.2486, 'lon': -75.5715},
    {'nombre': 'Estación Politécnico', 'lat': 6.2617, 'lon': -75.5897},
    {'nombre': 'Estación UdeA', 'lat': 6.2679, 'lon': -75.5672},
    {'nombre': 'Estación ITM', 'lat': 6.2121, 'lon': -75.5870},
]

def generate_sample_csv(n=5000):
    if ACC_FILE.exists() and ACC_FILE.stat().st_size > 100:
        return
    print(f"Generando {n} accidentes de muestra en {ACC_FILE}")
    start_date = datetime.now() - timedelta(days=365)
    rows = []
    tipos = ['Choque', 'Atropello', 'Caída', 'Volcamiento']
    for i in range(n):
        dt = start_date + timedelta(seconds=random.randint(0, 365*24*3600))
        lat = round(random.uniform(MIN_LAT, MAX_LAT), 6)
        lon = round(random.uniform(MIN_LON, MAX_LON), 6)
        gravedad = random.choices([1,2,3], weights=[70,25,5])[0]
        victimas = 0 if gravedad==1 else random.randint(1,3)
        fuente = random.choice(['Medata','Observatorio','DatosAbiertos'])
        rows.append({
            'fecha': dt.strftime('%Y-%m-%d %H:%M:%S'),
            'tipo': random.choice(tipos),
            'gravedad': gravedad,
            'lat': lat,
            'lon': lon,
            'comuna': random.choice(COMUNAS),
            'victimas': victimas,
            'fuente': fuente
        })
    with open(ACC_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['fecha','tipo','gravedad','lat','lon','comuna','victimas','fuente'])
        writer.writeheader()
        for r in rows:
            writer.writerow(r)

def load_accidents_to_db(session, AccidentModel, limit=None):
    try:
        from scraper import DataCollector
        collector = DataCollector()
        scraped = collector.scrape_medata_accidents()
        if scraped:
            objs = []
            for a in scraped:
                objs.append(AccidentModel(
                    fecha=a['fecha'], tipo=a['tipo'], gravedad=a['gravedad'],
                    lat=a['lat'], lon=a['lon'], comuna=a['comuna'],
                    victimas=a['victimas'], fuente=a['fuente']
                ))
            session.bulk_save_objects(objs)
            session.commit()
            print(f"[Ingestion] {len(objs)} accidentes cargados desde scraped data")
            return
    except Exception as e:
        print(f"[Ingestion] Scraper no disponible, usando CSV de muestra: {e}")

    generate_sample_csv(5000)
    with open(ACC_FILE, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        objs = []
        for i, row in enumerate(reader):
            if limit and i>=limit:
                break
            a = AccidentModel(
                fecha=row['fecha'], tipo=row['tipo'], gravedad=int(row.get('gravedad') or 1),
                lat=float(row['lat']), lon=float(row['lon']), comuna=row.get('comuna'),
                victimas=int(row.get('victimas') or 0), fuente=row.get('fuente')
            )
            objs.append(a)
        session.bulk_save_objects(objs)
        session.commit()

def ingest_trafico(session, SegmentoVial, Alerta):
    now = datetime.utcnow()
    try:
        from scraper import DataCollector
        collector = DataCollector()
        scraped = collector.scrape_observatorio_trafico()
        if scraped:
            for s in scraped:
                existing = session.query(SegmentoVial).filter_by(nombre=s['nombre']).first()
                if existing:
                    existing.velocidad_actual = s['velocidad_actual']
                    existing.velocidad_historica = s['velocidad_historica']
                    existing.densidad = s['densidad']
                    existing.color_congestion = s['color_congestion']
                    existing.lat_ini = s['lat_ini']
                    existing.lon_ini = s['lon_ini']
                    existing.lat_fin = s['lat_fin']
                    existing.lon_fin = s['lon_fin']
                    existing.ultima_actualizacion = now
                else:
                    s_copy = dict(s)
                    s_copy['ultima_actualizacion'] = now
                    session.add(SegmentoVial(**s_copy))

            for s in scraped:
                if s['color_congestion'] == 'red':
                    session.add(Alerta(
                        timestamp=now,
                        tipo='Congestión',
                        modulo_origen='Tráfico',
                        sector=s['nombre'],
                        severidad='alta',
                        descripcion=f'Velocidad crítica de {s["velocidad_actual"]} km/h en {s["nombre"]}',
                        activa=True
                    ))
            session.commit()
            print(f"[Ingestion] {len(scraped)} segmentos cargados desde scraped data")
            return scraped
    except Exception as e:
        print(f"[Ingestion] Trafico scraper error: {e}")

    hour = now.hour
    segments = []
    for i, name in enumerate(VIA_NAMES):
        base_speed = random.uniform(20, 50)
        if 6 <= hour <= 9 or 16 <= hour <= 19:
            base_speed *= random.uniform(0.5, 0.9)
        elif 22 <= hour or hour <= 4:
            base_speed *= random.uniform(1.1, 1.4)
        speed = round(base_speed, 1)
        density = max(0, int(100 - speed))
        color = 'green' if speed > 35 else ('yellow' if speed > 20 else 'red')
        segments.append({
            'nombre': name,
            'velocidad_actual': speed,
            'velocidad_historica': round(speed * random.uniform(0.85, 1.15), 1),
            'densidad': density,
            'color_congestion': color,
            'lat_ini': round(random.uniform(MIN_LAT, MAX_LAT), 6),
            'lon_ini': round(random.uniform(MIN_LON, MAX_LON), 6),
            'lat_fin': round(random.uniform(MIN_LAT, MAX_LAT), 6),
            'lon_fin': round(random.uniform(MIN_LON, MAX_LON), 6),
        })

    for s in segments:
        existing = session.query(SegmentoVial).filter_by(nombre=s['nombre']).first()
        if existing:
            existing.velocidad_actual = s['velocidad_actual']
            existing.densidad = s['densidad']
            existing.color_congestion = s['color_congestion']
            existing.ultima_actualizacion = now
        else:
            session.add(SegmentoVial(**s))

    for s in segments:
        if s['color_congestion'] == 'red':
            session.add(Alerta(
                timestamp=now,
                tipo='Congestión',
                modulo_origen='Tráfico',
                sector=s['nombre'],
                severidad='alta',
                descripcion=f'Velocidad crítica de {s["velocidad_actual"]} km/h en {s["nombre"]}',
                activa=True
            ))

    session.commit()
    return segments

def ingest_clima(session, CondicionClimatica, Alerta):
    now = datetime.utcnow()
    try:
        from scraper import DataCollector
        collector = DataCollector()
        scraped = collector.scrape_siata_weather()
        if scraped:
            for obs in scraped:
                session.add(CondicionClimatica(
                    timestamp=now,
                    estacion_siata=obs['estacion'],
                    precipitacion_mmh=obs['precipitacion_mmh'],
                    intensidad_label=obs['intensidad'],
                    latitud=obs['latitud'],
                    longitud=obs['longitud'],
                    temperature=obs['temperatura']
                ))
                if obs['precipitacion_mmh'] > 8:
                    session.add(Alerta(
                        timestamp=now,
                        tipo='Lluvia intensa',
                        modulo_origen='Clima',
                        sector=obs['estacion'],
                        severidad='alta' if obs['precipitacion_mmh'] > 15 else 'media',
                        descripcion=f'Precipitación de {obs["precipitacion_mmh"]} mm/h en {obs["estacion"]}',
                        activa=True
                    ))
            session.commit()
            print(f"[Ingestion] {len(scraped)} observaciones climáticas desde scraped data")
            return scraped
    except Exception as e:
        print(f"[Ingestion] Clima scraper error: {e}")

    condiciones = []
    for estacion in ESTACIONES_SIATA:
        precip = round(random.uniform(0, 25), 1)
        intensity = 'baja' if precip < 2 else ('moderada' if precip < 8 else 'alta')
        cond = CondicionClimatica(
            timestamp=now,
            estacion_siata=estacion['nombre'],
            precipitacion_mmh=precip,
            intensidad_label=intensity,
            latitud=estacion['lat'],
            longitud=estacion['lon'],
            temperature=round(random.uniform(20, 30), 1)
        )
        condiciones.append(cond)
        session.add(cond)

        if precip > 8:
            session.add(Alerta(
                timestamp=now,
                tipo='Lluvia intensa',
                modulo_origen='Clima',
                sector=estacion['nombre'],
                severidad= 'alta' if precip > 15 else 'media',
                descripcion=f'Precipitación de {precip} mm/h en {estacion["nombre"]}',
                activa=True
            ))

    session.commit()
    return condiciones

def calcular_prediccion(session, SegmentoVial, PrediccionCongestion):
    now = datetime.utcnow()
    from sqlalchemy import func
    count = session.query(func.count(SegmentoVial.id)).scalar()
    if count == 0:
        return []

    all_segments = session.query(SegmentoVial).all()
    predictions = []
    for segment in all_segments:
        for h_offset in [2, 3, 4]:
            target_hour = (now.hour + h_offset) % 24
            velocidad_base = segment.velocidad_historica or segment.velocidad_actual or 35

            if 6 <= target_hour <= 9:
                factor = random.uniform(0.4, 0.7)
            elif 16 <= target_hour <= 19:
                factor = random.uniform(0.5, 0.8)
            elif 22 <= target_hour or target_hour <= 4:
                factor = random.uniform(0.8, 1.0)
            else:
                factor = random.uniform(0.7, 0.9)

            prob = 1 - (factor * velocidad_base / 50)
            prob = min(0.95, max(0.05, round(prob, 2)))
            nivel = 'alta' if prob > 0.65 else ('media' if prob > 0.35 else 'baja')

            pred = PrediccionCongestion(
                fecha_objetivo=now.strftime('%Y-%m-%d'),
                hora_objetivo=target_hour,
                segmento_id=segment.id,
                probabilidad_congestion=prob,
                nivel=nivel,
                timestamp_calculo=now
            )
            predictions.append(pred)
            session.add(pred)

    session.commit()
    return predictions

def actualizar_zonas_riesgo(session, Accident, ZonaRiesgo, Alerta):
    from sqlalchemy import func
    stats = session.query(
        Accident.comuna,
        func.count(Accident.id).label('total'),
        func.sum(Accident.victimas).label('total_victimas')
    ).group_by(Accident.comuna).all()

    comuna_list = [s.comuna for s in stats if s.comuna]

    risks_by_comuna = dict(
        session.query(
            Accident.comuna,
            func.count(Accident.id)
        ).filter(
            Accident.comuna.in_(comuna_list),
            Accident.gravedad >= 2
        ).group_by(Accident.comuna).all()
    )

    existing_zones = {
        z.nombre_sector: z
        for z in session.query(ZonaRiesgo).filter(ZonaRiesgo.nombre_sector.in_(comuna_list)).all()
    }

    max_acc = max((s.total for s in stats), default=1)
    max_vic = max((s.total_victimas for s in stats), default=1)

    for stat in stats:
        if not stat.comuna:
            continue
        n_acc_norm = stat.total / max_acc
        n_vic_norm = (stat.total_victimas or 0) / max_vic
        ir = round((n_acc_norm * 0.5) + (n_vic_norm * 0.3) + (random.uniform(0, 1) * 0.2), 4)
        risks = risks_by_comuna.get(stat.comuna, 0)

        existing = existing_zones.get(stat.comuna)
        if existing:
            existing.indice_riesgo = ir
            existing.n_accidentes = stat.total
            existing.n_victimas = stat.total_victimas or 0
            existing.fecha_calculo = datetime.utcnow()
        else:
            centro_lat = random.uniform(MIN_LAT, MAX_LAT)
            centro_lon = random.uniform(MIN_LON, MAX_LON)
            session.add(ZonaRiesgo(
                nombre_sector=stat.comuna,
                comuna=stat.comuna,
                indice_riesgo=ir,
                n_accidentes=stat.total,
                n_victimas=stat.total_victimas or 0,
                n_fotomultas=int(risks * random.uniform(0.3, 0.7)),
                centroide_lat=centro_lat,
                centroide_lon=centro_lon,
                fecha_calculo=datetime.utcnow()
            ))

        if ir > 0.7:
            alerta = Alerta(
                timestamp=datetime.utcnow(),
                tipo='Zona de alto riesgo',
                modulo_origen='Accidentalidad',
                sector=stat.comuna,
                severidad='alta',
                descripcion=f'{stat.comuna} alcanzó índice de riesgo {ir} con {stat.total} accidentes',
                activa=True
            )
            session.add(alerta)

    session.commit()

def desactivar_alertas_antiguas(session, Alerta):
    cutoff = datetime.utcnow() - timedelta(hours=24)
    session.query(Alerta).filter(
        Alerta.timestamp < cutoff,
        Alerta.activa == True
    ).update({'activa': False})
    session.commit()
