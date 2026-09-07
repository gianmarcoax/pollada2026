import sys
import os
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models import Ticket, Evento
from app.schemas import TicketUpdate
from app.routers.tickets import editar_ticket, registrar_venta_multiple
from app.schemas import VentaMultipleCreate, ItemBoletoVenta, ItemPago

db = SessionLocal()

# Verificar evento
evento = db.query(Evento).first()
if not evento:
    evento = Evento(nombre="Test", activo=True)
    db.add(evento)
    db.commit()

# Limpiar tickets de prueba
db.query(Ticket).filter(Ticket.numero_boleto == 9005).delete()
db.commit()

# Simular POST registrar-venta (con pagos: []) -> Como si el usuario lo creara "separado"
print("\n--- TEST: CREAR SEPARADO ---")
venta_in = VentaMultipleCreate(
    evento_id=evento.id,
    codigo_alumno="TEST-1",
    nombre_alumno="TEST NAME",
    carrera="SIST",
    ciclo="1",
    estado="separado",
    precio_unitario=15.0,
    pagos=[], # Lista vacia desde el frontend (cuando no se pone monto)
    boletos=[ItemBoletoVenta(numero_boleto=9005, nombre_recolector="")]
)
tickets = registrar_venta_multiple(venta_in=venta_in, db=db, current_user=None)
t = tickets[0]
print(f"Creado - Estado: {t.estado}, Pagado: {t.monto_pagado}, Pendiente: {t.monto_pendiente}, Metodo: {t.metodo_pago}, Pagos: {t.pagos_detalle}")

# Simular PATCH editar (el usuario paga 5 soles)
print("\n--- TEST: EDITAR a PARCIALMENTE PAGADO ---")
update_in = TicketUpdate(
    precio_unitario=15.0,
    pagos=[ItemPago(monto=5.0, metodo="yape")]
)
# Nota: no enviamos 'estado' en el payload de edit porque el frontend no lo envia.
t_edit = editar_ticket(ticket_id=t.id, datos=update_in, db=db, current_user=None)
print(f"Edit 1 - Estado: {t_edit.estado}, Pagado: {t_edit.monto_pagado}, Pendiente: {t_edit.monto_pendiente}, Metodo: {t_edit.metodo_pago}, Pagos: {t_edit.pagos_detalle}")

# Simular PATCH editar (el usuario completa a 15 soles)
print("\n--- TEST: EDITAR a PAGADO ---")
update_in2 = TicketUpdate(
    precio_unitario=15.0,
    pagos=[ItemPago(monto=15.0, metodo="yape")]
)
t_edit2 = editar_ticket(ticket_id=t.id, datos=update_in2, db=db, current_user=None)
print(f"Edit 2 - Estado: {t_edit2.estado}, Pagado: {t_edit2.monto_pagado}, Pendiente: {t_edit2.monto_pendiente}, Metodo: {t_edit2.metodo_pago}, Pagos: {t_edit2.pagos_detalle}")

# Simular PATCH editar (el usuario borra el pago, vuelve a 0)
print("\n--- TEST: EDITAR a SEPARADO (borrar pago) ---")
update_in3 = TicketUpdate(
    precio_unitario=15.0,
    pagos=[]
)
t_edit3 = editar_ticket(ticket_id=t.id, datos=update_in3, db=db, current_user=None)
print(f"Edit 3 - Estado: {t_edit3.estado}, Pagado: {t_edit3.monto_pagado}, Pendiente: {t_edit3.monto_pendiente}, Metodo: {t_edit3.metodo_pago}, Pagos: {t_edit3.pagos_detalle}")

