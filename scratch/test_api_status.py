import requests

BASE_URL = "http://127.0.0.1:8000"
def run():
    res = requests.post(f"{BASE_URL}/auth/login", data={"username": "admin", "password": "123"})
    print("LOGIN:", res.status_code, res.json())
    token = res.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    # Obtener o crear evento
    ev_res = requests.get(f"{BASE_URL}/eventos", headers=headers)
    print("GET EVENTOS:", ev_res.status_code, ev_res.json())
    evs = ev_res.json()
    if not evs:
        ev = requests.post(f"{BASE_URL}/eventos", json={"nombre": "Test", "activo": True}, headers=headers).json()
        evento_id = ev['id']
    else:
        evento_id = evs[0]['id']
    
    # 1. Registrar venta pagada
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
    
    res = requests.post(f"{BASE_URL}/tickets/registrar-venta", json=payload, headers=headers)
    print("CREATE RESPONSE:", res.status_code, res.json())

    # 2. Editar ticket
    if res.status_code == 201:
        t = res.json()[0]
        ticket_id = t["id"]
        
        # Edit: Change to separado
        patch_payload = {
            "precio_unitario": 15.0,
            "pagos": [{"monto": 0.0, "metodo": "ninguno"}]
        }
        res2 = requests.patch(f"{BASE_URL}/tickets/{ticket_id}", json=patch_payload, headers=headers)
        print("PATCH RESPONSE:", res2.status_code, res2.json())

run()
