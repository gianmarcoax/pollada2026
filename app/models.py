from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base

class EstudianteMatriculado(Base):
    __tablename__ = "estudiantes_matriculados"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, index=True, nullable=False)
    nombre = Column(String(255), index=True, nullable=False)
    carrera = Column(String(100), default="INGENIERIA DE SISTEMAS")
    ciclo = Column(String(20), default="1")

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

class Evento(Base):
    __tablename__ = "eventos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    fecha = Column(DateTime, nullable=False, default=datetime.utcnow)
    activo = Column(Boolean, default=True, nullable=False)

    tickets = relationship("Ticket", back_populates="evento", cascade="all, delete-orphan")

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    numero_boleto = Column(Integer, index=True, nullable=False) # Número físico de boleto (1 a 1000)
    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=False)
    codigo_alumno = Column(String(50), index=True, nullable=False) # Código de 6 cifras o DNI de 7/8 cifras
    nombre_alumno = Column(String(255), nullable=False)
    carrera = Column(String(100), default="INGENIERIA DE SISTEMAS")
    ciclo = Column(String(20), default="1")
    nombre_recolector = Column(String(255), nullable=True) # Nombre/apodo de la persona que recogerá
    
    estado = Column(String(50), default="separado", nullable=False) # separado | parcialmente_pagado | pagado
    precio_unitario = Column(Float, default=15.0, nullable=False)
    monto_total = Column(Float, default=15.0, nullable=False)
    monto_pagado = Column(Float, default=0.0, nullable=False)
    monto_pendiente = Column(Float, default=15.0, nullable=False)
    metodo_pago = Column(String(50), default="ninguno", nullable=False) # yape | plin | efectivo | ninguno | mixto
    # Lista JSON de pagos individuales: [{"monto": 5.0, "metodo": "efectivo"}, ...]
    pagos_detalle = Column(Text, default="[]", nullable=False)

    entregado = Column(Boolean, default=False, nullable=False)
    fecha_hora_entrega = Column(DateTime, nullable=True, default=None)

    evento = relationship("Evento", back_populates="tickets")

    # Restricción: El número de boleto debe ser único por cada evento
    __table_args__ = (
        UniqueConstraint('evento_id', 'numero_boleto', name='uq_evento_numero_boleto'),
    )
