# Sistema de Gestión de Boletos — Documentación

> Aplicación web para la venta, registro y entrega de boletos físicos numerados para eventos de polladas. Desarrollada con **FastAPI + SQLite + Vanilla JS**.

---

## Tabla de Contenidos

1. [Descripción General](#1-descripción-general)
2. [Tecnologías utilizadas](#2-tecnologías-utilizadas)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Base de Datos](#4-base-de-datos)
5. [Autenticación y Seguridad](#5-autenticación-y-seguridad)
6. [API REST — Endpoints](#6-api-rest--endpoints)
7. [Pantallas del Frontend](#7-pantallas-del-frontend)
8. [Configuración Local](#8-configuración-local)
9. [Despliegue en VPS con Docker](#9-despliegue-en-vps-con-docker)
10. [Actualizar el servidor](#10-actualizar-el-servidor-subir-cambios)
11. [Importar y Exportar datos](#11-importar-y-exportar-datos)
12. [Variables de entorno](#12-variables-de-entorno)
13. [Credenciales por defecto](#13-credenciales-por-defecto)
14. [Notas de desarrollo](#14-notas-de-desarrollo)

---

## 1. Descripción General

El sistema permite gestionar la venta y distribución de **boletos físicos numerados del 1 al 1000** para eventos de pollada escolar. Sus funcionalidades principales son:

- **Registro de ventas**: asignar boletos físicos a compradores con autocompletado desde el padrón de matriculados.
- **Control de pagos**: estado del pago (pagado, parcialmente pagado, separado), monto abonado y método (efectivo, Yape, Plin).
- **Entrega en puerta**: buscar boletos en tiempo real y marcarlos como entregados, cobrando el saldo pendiente si aplica.
- **Edición de boletos**: modificar cualquier campo de un boleto ya registrado.
- **Dashboard con KPIs**: métricas en tiempo real (recaudado, pendiente, entregados, cobertura de matriculados).
- **Exportar / Importar**: descargar reportes en Excel o CSV e importar datos desde esos mismos archivos.
- **Multiusuario**: sistema de login con JWT — solo usuarios autenticados pueden operar.

---

## 2. Tecnologías Utilizadas

| Capa | Tecnología | Versión mínima |
|---|---|---|
| Backend | FastAPI | 0.100+ |
| Servidor ASGI | Uvicorn | 0.22+ |
| ORM / BD | SQLAlchemy + SQLite | 2.0+ |
| Validación | Pydantic | 2.0+ |
| Autenticación | JWT (python-jose) + bcrypt | — |
| Excel | openpyxl | 3.1+ |
| Frontend | HTML5 + Vanilla CSS + Vanilla JS | — |
| Iconos | FontAwesome 6 | CDN |
| Fuentes | Plus Jakarta Sans | Google Fonts |
| Contenedor | Docker + Docker Compose | — |

---

## 3. Estructura del Proyecto

```
sistema-tickets-polladas/
│
├── app/                          # Paquete principal del backend
│   ├── main.py                   # Punto de entrada FastAPI, rutas y archivos estáticos
│   ├── database.py               # Conexión SQLAlchemy, soporte DATABASE_PATH (Docker)
│   ├── models.py                 # Modelos ORM: Ticket, Evento, Usuario, EstudianteMatriculado
│   ├── schemas.py                # Schemas Pydantic (request / response)
│   ├── auth.py                   # JWT, hashing bcrypt, get_current_user
│   ├── utils.py                  # Utilidades menores
│   └── routers/
│       ├── auth.py               # /auth/login, /auth/me, /auth/registro
│       ├── tickets.py            # CRUD tickets, importar, registrar venta, entrega
│       ├── eventos.py            # CRUD eventos, KPIs, exportar Excel/CSV
│       └── estudiantes.py        # Búsqueda de matriculados (autocomplete)
│
├── frontend/                     # SPA servida como archivos estáticos en /app
│   ├── index.html                # HTML de todas las pantallas
│   ├── app.js                    # Lógica JS completa
│   └── styles.css                # Design system (glassmorphism, dark mode)
│
├── static/                       # Archivos estáticos adicionales
│
├── EstudiantesMatriculados.xlsx  # Padrón de 550 estudiantes (seed automático)
├── seed.py                       # Poblado inicial de la base de datos
├── run.py                        # Script de arranque local
├── requirements.txt              # Dependencias Python
├── Dockerfile                    # Imagen Docker para producción
├── docker-compose.yml            # Contenedor + volumen persistente para la BD
├── .dockerignore                 # Archivos excluidos del build
└── sistema_tickets.db            # Base de datos SQLite (auto-generada)
```

---

## 4. Base de Datos

Motor: **SQLite**, generada automáticamente al iniciar la app. En Docker se persiste en el volumen `tickets_data`.

### Tabla `estudiantes_matriculados`
Padrón de alumnos cargado desde `EstudiantesMatriculados.xlsx` al primer inicio.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Auto-incremental |
| `codigo` | VARCHAR(50) UNIQUE | Código de 6 cifras del alumno |
| `nombre` | VARCHAR(255) | Nombre completo |
| `carrera` | VARCHAR(100) | Carrera / Escuela |
| `ciclo` | VARCHAR(20) | Ciclo académico |

### Tabla `usuarios`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Auto-incremental |
| `username` | VARCHAR(50) UNIQUE | Nombre de usuario |
| `password_hash` | VARCHAR(255) | Hash bcrypt de la contraseña |

### Tabla `eventos`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Auto-incremental |
| `nombre` | VARCHAR(100) | Nombre del evento |
| `fecha` | DATETIME | Fecha/hora del evento |
| `activo` | BOOLEAN | Visible en el selector global del header |

### Tabla `tickets`
Registro central de boletos — uno por cada boleto físico asignado.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | INTEGER PK | Auto-incremental |
| `numero_boleto` | INTEGER | Nº físico del boleto (1–1000) |
| `evento_id` | INTEGER FK | Evento al que pertenece |
| `codigo_alumno` | VARCHAR(50) | Código o DNI del comprador |
| `nombre_alumno` | VARCHAR(255) | Nombre completo del comprador |
| `carrera` | VARCHAR(100) | Carrera del comprador |
| `ciclo` | VARCHAR(20) | Ciclo del comprador |
| `nombre_recolector` | VARCHAR(255) | Persona que recogerá la pollada |
| `estado` | VARCHAR(50) | `pagado` / `parcialmente_pagado` / `separado` |
| `precio_unitario` | FLOAT | Precio por boleto (default S/ 15.00) |
| `monto_total` | FLOAT | Total a pagar |
| `monto_pagado` | FLOAT | Monto abonado |
| `monto_pendiente` | FLOAT | Saldo pendiente (calculado automáticamente) |
| `metodo_pago` | VARCHAR(50) | `efectivo` / `yape` / `plin` / `ninguno` |
| `entregado` | BOOLEAN | Si ya se entregó la pollada físicamente |
| `fecha_hora_entrega` | DATETIME | Timestamp de la entrega |

> **Restricción única:** `(evento_id, numero_boleto)` — no puede haber dos boletos con el mismo número en el mismo evento.

---

## 5. Autenticación y Seguridad

- Algoritmo: **JWT HS256**
- Expiración del token: **24 horas**
- Contraseñas: hasheadas con **bcrypt**
- Secret key: variable `SECRET_KEY` en `app/auth.py`

> **IMPORTANTE:** Cambiar `SECRET_KEY` antes de desplegar en producción. El valor actual es un placeholder de desarrollo.

Todos los endpoints (excepto `/auth/login`) requieren el header:
```
Authorization: Bearer <token>
```

---

## 6. API REST — Endpoints

Documentación Swagger interactiva:
- Local: `http://localhost:8000/docs`
- VPS: `http://161.132.39.114:8082/docs`

---

### Autenticación — `/auth`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/login` | Obtiene token JWT. Body form-data: `username` + `password` |
| `GET` | `/auth/me` | Devuelve el usuario autenticado actual |
| `POST` | `/auth/registro` | Crea un nuevo usuario |

---

### Estudiantes — `/estudiantes`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/estudiantes/buscar?q=<texto>` | Busca en el padrón por código o nombre (autocomplete) |
| `GET` | `/estudiantes/{codigo}` | Obtiene un estudiante por su código exacto |

---

### Eventos — `/eventos`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/eventos` | Lista todos los eventos |
| `POST` | `/eventos` | Crea un evento nuevo |
| `GET` | `/eventos/{id}` | Obtiene un evento por ID |
| `PUT` | `/eventos/{id}` | Actualiza datos de un evento |
| `DELETE` | `/eventos/{id}` | Elimina evento y sus boletos (cascada) |
| `GET` | `/eventos/{id}/kpis` | Métricas KPI del evento |
| `GET` | `/eventos/kpis` | KPIs de todos los eventos |
| `GET` | `/eventos/{id}/exportar/excel` | Descarga reporte `.xlsx` |
| `GET` | `/eventos/{id}/exportar/csv` | Descarga reporte `.csv` |

---

### Tickets — `/tickets`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/tickets?evento_id=<id>` | Lista tickets de un evento |
| `POST` | `/tickets/registrar-venta` | Registra uno o varios boletos |
| `GET` | `/tickets/buscar?q=<texto>` | Busca por nº, código, nombre o recolector |
| `POST` | `/tickets/confirmar-entrega` | Marca boleto como entregado (cobro de saldo opcional) |
| `GET` | `/tickets/{id}` | Obtiene un ticket por ID |
| `PATCH` | `/tickets/{id}` | Edita cualquier campo del ticket |
| `POST` | `/tickets/importar` | Importa desde Excel o CSV |

#### Body: `POST /tickets/registrar-venta`
```json
{
  "evento_id": 1,
  "codigo_alumno": "247358",
  "nombre_alumno": "Juan Pérez",
  "carrera": "INGENIERIA DE SISTEMAS",
  "ciclo": "10",
  "cantidad": 2,
  "boleto_inicial": 101,
  "recolectores": ["Juan Pérez", "Maria López"],
  "estado": "pagado",
  "precio_unitario": 15.00,
  "monto_pagado": 30.00,
  "metodo_pago": "yape"
}
```

#### Body: `POST /tickets/confirmar-entrega`
```json
{
  "numero_boleto": 101,
  "evento_id": 1,
  "monto_cobrado_en_puerta": 7.50,
  "metodo_pago_saldo": "efectivo"
}
```

#### Body: `PATCH /tickets/{id}` — todos los campos opcionales
```json
{
  "nombre_alumno": "Nuevo Nombre",
  "codigo_alumno": "123456",
  "carrera": "SISTEMAS",
  "ciclo": "5",
  "nombre_recolector": "Pedro",
  "estado": "pagado",
  "precio_unitario": 15.00,
  "monto_pagado": 15.00,
  "metodo_pago": "efectivo",
  "entregado": false
}
```
> `monto_pendiente` y `estado` se recalculan automáticamente si cambias `precio_unitario` o `monto_pagado`.

#### Form-data: `POST /tickets/importar`

| Campo | Tipo | Descripción |
|---|---|---|
| `evento_id` | int | ID del evento destino |
| `modo` | string | `merge` o `replace` |
| `archivo` | file | Archivo `.xlsx` o `.csv` |

---

## 7. Pantallas del Frontend

La app es una **SPA** servida desde `/app/`. No recarga la página entre pantallas.

### Login
- Formulario usuario + contraseña, token guardado en `sessionStorage`.
- Toggle de visibilidad de contraseña.
- Redirección automática si ya hay sesión activa.

### Dashboard & KPIs
Métricas en tiempo real del evento activo seleccionado en el header:

| KPI | Descripción |
|---|---|
| Matriculados con Boleto | Alumnos del padrón que tienen al menos un boleto |
| Total Boletos | Total registrados en el evento |
| Recaudado Cobrado | Suma de `monto_pagado` |
| Saldo Pendiente | Suma de `monto_pendiente` |
| Pagados 100% | Boletos con estado `pagado` |
| Parcialmente Pagados | Estado `parcialmente_pagado` |
| Polladas Entregadas | Boletos con `entregado = true` |

Botones disponibles:
- **Actualizar** — recarga KPIs y tabla
- **Importar** — abre modal de importación Excel/CSV
- **Exportar Excel** y **Exportar CSV**

Tabla de boletos con búsqueda en tiempo real.

### Nueva Venta
- Autocompletado de alumno al escribir código/nombre (debounce 150ms).
- Venta de 1 a 20 boletos en una operación.
- Campo de "persona que recoge" por cada boleto.
- Resumen visual de los boletos asignados tras confirmar.

### Entrega de Polladas
- Búsqueda por: número de boleto, código, DNI o nombre del recolector.
- Muestra estado del boleto y alerta si tiene saldo pendiente.
- Modal de confirmación con cobro opcional del saldo en puerta.

### Editar Boleto
- Misma búsqueda que la pantalla de Entrega.
- Botón "Editar este Boleto" abre modal con todos los campos precargados.
- Campos editables: código, nombre, carrera, ciclo, recolector, estado, precio, monto pagado, método de pago, ¿entregado?
- Los resultados se actualizan automáticamente al guardar.

---

## 8. Configuración Local

### Requisitos
- Python 3.10 o superior

### Pasos

```bash
# Ir al directorio del proyecto
cd sistema-tickets-polladas

# Crear entorno virtual
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Linux / Mac

# Instalar dependencias
pip install -r requirements.txt

# Iniciar el servidor
python run.py
```

El servidor arranca en `http://localhost:8000`.
La BD y el usuario `admin` se crean automáticamente al primer inicio.

El script muestra también la IP de red local para acceso desde celular:
```
► Acceso desde Celular / Red Wi-Fi: http://192.168.x.x:8000
```

---

## 9. Despliegue en VPS con Docker

### Requisitos en la VPS
- Docker y Docker Compose instalados

### Primer despliegue — desde PowerShell local

```powershell
# Copiar el proyecto completo
scp -i $env:USERPROFILE\.ssh\id_ed25519_vps -r `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas" `
  root@161.132.39.114:~/sistemas/
```

```bash
# En la VPS — construir y levantar
cd ~/sistemas/sistema-tickets-polladas
docker compose up -d --build
```

App disponible en: `http://161.132.39.114:8082`

### Puertos

| Puerto interno | Puerto externo (VPS) |
|---|---|
| 8000 (contenedor) | **8082** |

### Persistencia de la base de datos
La BD SQLite se guarda en el volumen Docker `tickets_data`, montado en `/app/data/sistema_tickets.db`.
Los datos sobreviven a reinicios y rebuilds del contenedor.

---

## 10. Actualizar el servidor (subir cambios)

Ejecutar **desde PowerShell local**:

```powershell
# Archivos de backend
scp -i $env:USERPROFILE\.ssh\id_ed25519_vps `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\app\main.py" `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\app\schemas.py" `
  root@161.132.39.114:~/sistemas/sistema-tickets-polladas/app/

scp -i $env:USERPROFILE\.ssh\id_ed25519_vps `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\app\routers\tickets.py" `
  root@161.132.39.114:~/sistemas/sistema-tickets-polladas/app/routers/

# Archivos de frontend
scp -i $env:USERPROFILE\.ssh\id_ed25519_vps `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\frontend\index.html" `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\frontend\app.js" `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\frontend\styles.css" `
  root@161.132.39.114:~/sistemas/sistema-tickets-polladas/frontend/

# Reiniciar el contenedor
ssh -i $env:USERPROFILE\.ssh\id_ed25519_vps root@161.132.39.114 `
  "cd ~/sistemas/sistema-tickets-polladas && docker compose restart"
```

> Si se agregan dependencias nuevas en `requirements.txt`, usar `docker compose up -d --build` en lugar de `restart`.

---

## 11. Importar y Exportar datos

### Exportar
Dashboard → **Exportar Excel** o **Exportar CSV** — descarga todos los boletos del evento activo.

**Columnas del archivo exportado:**

| Columna | Ejemplo |
|---|---|
| Nº Boleto | 101 |
| Código / DNI | 247358 |
| Nombre Comprador | Juan Pérez |
| Carrera | INGENIERIA DE SISTEMAS |
| Ciclo | 10 |
| Persona que Recoge | Pedro |
| Estado | PAGADO |
| Monto Total (S/) | 15.00 |
| Monto Pagado (S/) | 15.00 |
| Monto Pendiente (S/) | 0.00 |
| Método de Pago | YAPE |
| Entregado | Sí |
| Fecha de Entrega | 2026-09-04 10:30:00 |

### Importar
Dashboard → botón **Importar** → seleccionar archivo y modo.

**Modos:**
- **Combinar**: agrega nuevos y actualiza los existentes por Nº Boleto. No borra nada.
- **Reemplazar todo**: borra todos los boletos del evento y los carga desde el archivo.

**Flujo recomendado para sincronizar datos con la VPS:**
1. Exportar el Excel actual como backup.
2. Editar con los datos actualizados.
3. Importar en modo **Combinar**.

---

## 12. Variables de Entorno

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `DATABASE_PATH` | `sistema_tickets.db` | Ruta al archivo SQLite. En Docker: `/app/data/sistema_tickets.db` |
| `PYTHONUNBUFFERED` | `1` | Logs en tiempo real (Docker) |
| `PYTHONDONTWRITEBYTECODE` | `1` | Evita generar archivos `.pyc` (Docker) |

---

## 13. Credenciales por Defecto

| Campo | Valor |
|---|---|
| Usuario | `admin` |
| Contraseña | `admin123` |

> Cambiar la contraseña después del primer despliegue en producción.

---

## 14. Notas de Desarrollo

- El frontend **no usa frameworks** — HTML + CSS + JS puro para máxima compatibilidad.
- Sigue el patrón **Router → Schema → Model** estándar de FastAPI.
- `reload=False` en uvicorn evita el problema de procesos duplicados que causaba errores `405 Method Not Allowed` en endpoints `PATCH`.
- Los `StaticFiles` se montan **después** de los `include_router()` en `main.py` para que las rutas de la API tengan prioridad.
- El autocompletado de estudiantes usa un debounce de 150ms sobre el endpoint `/estudiantes/buscar`.
- La restricción única `(evento_id, numero_boleto)` en la tabla `tickets` impide duplicar boletos por accidente.

---

*Sistema de Gestión de Boletos — Documentación v2.0 — 2026 Décimo Semestre*
