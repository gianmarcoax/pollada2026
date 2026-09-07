from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# ----------------- JWT SCHEMAS -----------------
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# ----------------- USUARIO SCHEMAS -----------------
class UsuarioBase(BaseModel):
    username: str

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioOut(UsuarioBase):
    id: int

    class Config:
        from_attributes = True

# ----------------- ESTUDIANTE MATRICULADO -----------------
class EstudianteOut(BaseModel):
    id: int
    codigo: str
    nombre: str
    carrera: str
    ciclo: str

    class Config:
        from_attributes = True

# ----------------- EVENTO SCHEMAS -----------------
class EventoBase(BaseModel):
    nombre: str
    fecha: Optional[datetime] = Field(default_factory=datetime.utcnow)
    activo: bool = True

class EventoCreate(EventoBase):
    pass

class EventoUpdate(BaseModel):
    nombre: Optional[str] = None
    fecha: Optional[datetime] = None
    activo: Optional[bool] = None

class EventoOut(EventoBase):
    id: int

    class Config:
        from_attributes = True

class EventoKPIsOut(BaseModel):
    evento_id: int
    nombre_evento: str
    total_boletos: int
    pagados: int
    parcialmente_pagados: int
    separados: int
    entregados: int
    total_recaudado: float
    total_pendiente: float
    estudiantes_matriculados_total: int
    estudiantes_matriculados_con_boleto: int
    porcentaje_cobertura_matriculados: float

# ----------------- TICKET & VENTA SCHEMAS -----------------
class ItemBoletoVenta(BaseModel):
    numero_boleto: int # Número del boleto físico (1 a 1000)
    nombre_recolector: Optional[str] = None # Persona referencial para recojo de esta pollada

class VentaMultipleCreate(BaseModel):
    evento_id: int
    codigo_alumno: str # Código de 6 cifras o DNI de 7/8 cifras
    nombre_alumno: str
    carrera: Optional[str] = "INGENIERIA DE SISTEMAS"
    ciclo: Optional[str] = "1"
    estado: str = "pagado" # separado | parcialmente_pagado | pagado
    precio_unitario: float = 15.0
    monto_pagado_total: float = 0.0 # Monto total abonado en la transacción
    metodo_pago: Optional[str] = "efectivo" # yape | plin | efectivo | ninguno
    boletos: List[ItemBoletoVenta] # Lista de boletos físicos comprados (hasta 20)

class TicketUpdate(BaseModel):
    nombre_alumno: Optional[str] = None
    codigo_alumno: Optional[str] = None
    carrera: Optional[str] = None
    ciclo: Optional[str] = None
    nombre_recolector: Optional[str] = None
    estado: Optional[str] = None
    precio_unitario: Optional[float] = None
    monto_pagado: Optional[float] = None
    metodo_pago: Optional[str] = None
    entregado: Optional[bool] = None
    fecha_hora_entrega: Optional[datetime] = None

class ConfirmarEntregaPaymentRequest(BaseModel):
    numero_boleto: int
    monto_cobrado_adicional: Optional[float] = 0.0
    metodo_pago_entrega: Optional[str] = None

class TicketOut(BaseModel):
    id: int
    numero_boleto: int
    evento_id: int
    codigo_alumno: str
    nombre_alumno: str
    carrera: str
    ciclo: str
    nombre_recolector: Optional[str] = None
    estado: str
    precio_unitario: float
    monto_total: float
    monto_pagado: float
    monto_pendiente: float
    metodo_pago: str
    entregado: bool
    fecha_hora_entrega: Optional[datetime] = None
    evento: Optional[EventoOut] = None

    class Config:
        from_attributes = True
