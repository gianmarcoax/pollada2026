import json
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, field_validator

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
    # Desglose por método de pago
    total_yape:     float = 0.0
    total_efectivo: float = 0.0
    total_plin:     float = 0.0
    # Cobertura de estudiantes matriculados
    estudiantes_matriculados_total: int
    estudiantes_matriculados_con_boleto: int
    porcentaje_cobertura_matriculados: float

# ----------------- PAGO INDIVIDUAL -----------------
class ItemPago(BaseModel):
    """Representa un pago parcial con monto y método específico."""
    monto:  float  # Monto abonado en este método
    metodo: str    # efectivo | yape | plin | ninguno

# ----------------- TICKET & VENTA SCHEMAS -----------------
class ItemBoletoVenta(BaseModel):
    numero_boleto: int               # Número del boleto físico (1 a 1000)
    nombre_recolector: Optional[str] = None  # Persona referencial para recojo

class VentaMultipleCreate(BaseModel):
    evento_id: int
    codigo_alumno: str               # Código de 6 cifras o DNI de 7/8 cifras
    nombre_alumno: str
    carrera: Optional[str]  = "INGENIERIA DE SISTEMAS"
    ciclo:   Optional[str]  = "1"
    estado:  str            = "pagado"   # separado | parcialmente_pagado | pagado
    precio_unitario: float  = 15.0
    # ── Lista dinámica de pagos (nuevo) ──
    pagos: Optional[List[ItemPago]] = []
    # ── Campos legacy (backward compat si no se usan pagos) ──
    monto_pagado_total: float          = 0.0
    metodo_pago:        Optional[str]  = "ninguno"
    boletos: List[ItemBoletoVenta]     # Lista de boletos físicos (hasta 20)

class TicketUpdate(BaseModel):
    nombre_alumno:     Optional[str]            = None
    codigo_alumno:     Optional[str]            = None
    carrera:           Optional[str]            = None
    ciclo:             Optional[str]            = None
    nombre_recolector: Optional[str]            = None
    estado:            Optional[str]            = None
    precio_unitario:   Optional[float]          = None
    # ── Lista de pagos: si se envía, reemplaza toda la lista ──
    pagos:             Optional[List[ItemPago]] = None
    # ── Campos legacy ──
    monto_pagado:      Optional[float]          = None
    metodo_pago:       Optional[str]            = None
    entregado:         Optional[bool]           = None
    fecha_hora_entrega:Optional[datetime]       = None

class ConfirmarEntregaPaymentRequest(BaseModel):
    numero_boleto:           int
    monto_cobrado_adicional: Optional[float] = 0.0
    metodo_pago_entrega:     Optional[str]   = None

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
    pagos_detalle: List[Any] = []  # Lista de {monto, metodo} parseada desde JSON
    entregado: bool
    fecha_hora_entrega: Optional[datetime] = None
    evento: Optional[EventoOut] = None

    @field_validator("pagos_detalle", mode="before")
    @classmethod
    def parse_pagos_detalle(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        if isinstance(v, list):
            return v
        return []

    class Config:
        from_attributes = True
