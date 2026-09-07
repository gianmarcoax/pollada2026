import sys
import os
sys.path.append(os.getcwd())

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import Usuario, Evento, Ticket
import json

client = TestClient(app)

# Obtener eventos
res = client.get("/eventos")
print("EVENTOS:", res.json())
if res.status_code == 200 and len(res.json()) > 0:
    evento_id = res.json()[0]["id"]
else:
    # Crear uno bypassando auth o simulando login
    pass

# Simulamos la creacion y edicion directamente usando TestClient? 
# Wait, TestClient needs auth. Let's just mock get_current_user in app.
from app.auth import get_current_user

app.dependency_overrides[get_current_user] = lambda: Usuario(id=1, username="test")

# 1. Crear Evento
ev = client.post("/eventos", json={"nombre": "Test", "activo": True})
evento_id = ev.json()["id"]

# Limpiar tickets 9005
db = SessionLocal()
db.query(Ticket).filter(Ticket.numero_boleto == 9005).delete()
db.commit()
db.close()

# 2. Vender
payload = {
    "evento_id": evento_id,
    "codigo_alumno": "TEST-1",
    "nombre_alumno": "TEST NAME",
    "carrera": "SIST",
    "ciclo": "1",
    "estado": "pagado",
    "precio_unitario": 15.0,
    "pagos": [{"monto": 15.0, "metodo": "efectivo"}],
    "boletos": [{"numero_boleto": 9005, "nombre_recolector": ""}]
}
res = client.post("/tickets/registrar-venta", json=payload)
print("CREATE:", res.json())
if res.status_code == 201:
    t_id = res.json()[0]["id"]
    
    # 3. Edit (empty pagos)
    patch_payload = {
        "precio_unitario": 15.0,
        "pagos": []
    }
    res2 = client.patch(f"/tickets/{t_id}", json=patch_payload)
    print("EDIT (separado):", res2.json())
    
    # 4. Edit (parcial)
    patch_payload2 = {
        "precio_unitario": 15.0,
        "pagos": [{"monto": 5.0, "metodo": "yape"}]
    }
    res3 = client.patch(f"/tickets/{t_id}", json=patch_payload2)
    print("EDIT (parcial):", res3.json())
