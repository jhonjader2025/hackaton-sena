from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class Accident(Base):
    __tablename__ = 'accidents'
    id = Column(Integer, primary_key=True)
    fecha = Column(String, index=True)
    tipo = Column(String)
    gravedad = Column(Integer)
    lat = Column(Float, index=True)
    lon = Column(Float, index=True)
    comuna = Column(String)
    victimas = Column(Integer)
    fuente = Column(String)

class SegmentoVial(Base):
    __tablename__ = 'segmentos_viales'
    id = Column(Integer, primary_key=True)
    nombre = Column(String, index=True)
    lat_ini = Column(Float)
    lon_ini = Column(Float)
    lat_fin = Column(Float)
    lon_fin = Column(Float)
    velocidad_actual = Column(Float, default=0)
    velocidad_historica = Column(Float, default=0)
    densidad = Column(Integer, default=0)
    color_congestion = Column(String, default='green')
    ultima_actualizacion = Column(DateTime, default=func.now)

class ZonaRiesgo(Base):
    __tablename__ = 'zonas_riesgo'
    id = Column(Integer, primary_key=True)
    nombre_sector = Column(String, index=True)
    comuna = Column(String)
    indice_riesgo = Column(Float, default=0)
    n_accidentes = Column(Integer, default=0)
    n_victimas = Column(Integer, default=0)
    n_fotomultas = Column(Integer, default=0)
    centroide_lat = Column(Float)
    centroide_lon = Column(Float)
    fecha_calculo = Column(DateTime, default=func.now)

class PrediccionCongestion(Base):
    __tablename__ = 'predicciones_congestion'
    id = Column(Integer, primary_key=True)
    fecha_objetivo = Column(String, index=True)
    hora_objetivo = Column(Integer)
    segmento_id = Column(Integer)
    probabilidad_congestion = Column(Float, default=0)
    nivel = Column(String, default='baja')
    timestamp_calculo = Column(DateTime, default=func.now)

class CondicionClimatica(Base):
    __tablename__ = 'condiciones_climaticas'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=func.now, index=True)
    estacion_siata = Column(String)
    precipitacion_mmh = Column(Float, default=0)
    intensidad_label = Column(String, default='baja')
    latitud = Column(Float)
    longitud = Column(Float)
    temperature = Column(Float, nullable=True)

class Alerta(Base):
    __tablename__ = 'alertas'
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=func.now, index=True)
    tipo = Column(String)
    modulo_origen = Column(String)
    sector = Column(String)
    severidad = Column(String, default='media')
    descripcion = Column(Text)
    activa = Column(Boolean, default=True)
