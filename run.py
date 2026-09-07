import sys
import socket
import uvicorn

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def get_local_ip():
    """
    Obtiene la dirección IP local de la máquina en la red LAN/Wi-Fi.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # No necesita ser alcanzable realmente
        s.connect(('10.255.255.255', 1))
        local_ip = s.getsockname()[0]
    except Exception:
        local_ip = '127.0.0.1'
    finally:
        s.close()
    return local_ip

import os

if __name__ == "__main__":
    ip = get_local_ip()
    port_env = os.environ.get("PORT", "8000")
    try:
        port = int(port_env)
    except (ValueError, TypeError):
        port = 8000

    print("\n" + "="*70)
    print("  🎟️   SISTEMA DE GESTIÓN DE TICKETS - SERVIDOR LOCAL Y RED   🎟️")
    print("="*70)
    print(f"  ► Acceso desde esta PC (Local):    http://localhost:{port}")
    print(f"  ► Acceso desde Celular / Red Wi-Fi: http://{ip}:{port}")
    print(f"  ► Documentación Swagger API:        http://localhost:{port}/docs")
    print("="*70)
    print("  Servidor ejecutándose con uvicorn (host 0.0.0.0)... Presiona Ctrl+C para detener.\n")

    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
