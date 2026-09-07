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
| `monto_pagado` | FLOAT | Monto abonado acumulado (calculado) |
| `monto_pendiente` | FLOAT | Saldo pendiente (calculado automáticamente) |
| `metodo_pago` | VARCHAR(50) | `efectivo` / `yape` / `plin` / `mixto` / `ninguno` |
| `pagos_detalle` | TEXT (JSON) | Array JSON con desglose de pagos: `[{"monto": 5.0, "metodo": "efectivo"}, ...]` |
| `entregado` | BOOLEAN | Si ya se entregó la pollada físicamente |
| `fecha_hora_entrega` | DATETIME | Timestamp de entrega en **Hora de Perú (UTC-5)** |

> **Migración automática:** Al arrancar la aplicación, `app/database.py` comprueba la existencia de `pagos_detalle` y la añade con `ALTER TABLE` si no existe, preservando la compatibilidad con registros existentes sin pérdida de datos.
>
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
Admite el campo `pagos` como array dinámico con múltiples abonos y métodos (`efectivo`, `yape`, `plin`). Si se envía `pagos`, los valores de `monto_pagado`, `metodo_pago` y `estado` se calculan automáticamente.

```json
{
  "evento_id": 1,
  "codigo_alumno": "247358",
  "nombre_alumno": "Juan Pérez",
  "carrera": "INGENIERIA DE SISTEMAS",
  "ciclo": "10",
  "cantidad": 1,
  "boleto_inicial": 101,
  "recolectores": ["Juan Pérez"],
  "precio_unitario": 15.00,
  "pagos": [
    { "monto": 5.00, "metodo": "efectivo" },
    { "monto": 10.00, "metodo": "plin" }
  ]
}
```

#### Body: `POST /tickets/confirmar-entrega`
Marca el boleto como entregado. Si se cobra saldo pendiente en puerta, se añade automáticamente al historial de `pagos_detalle` y se registra la fecha/hora en **Zona Horaria de Perú (UTC-5)**:
```json
{
  "numero_boleto": 101,
  "evento_id": 1,
  "monto_cobrado_en_puerta": 7.50,
  "metodo_pago_saldo": "efectivo"
}
```

#### Body: `PATCH /tickets/{id}` — todos los campos opcionales
Permite actualizar campos personales, de entrega o el desglose completo de pagos:
```json
{
  "nombre_alumno": "Nuevo Nombre",
  "codigo_alumno": "123456",
  "carrera": "SISTEMAS",
  "ciclo": "5",
  "nombre_recolector": "Pedro",
  "precio_unitario": 15.00,
  "pagos": [
    { "monto": 10.00, "metodo": "yape" },
    { "monto": 5.00, "metodo": "efectivo" }
  ],
  "entregado": false
}
```
> Si se envía `pagos`, el sistema recalcula de forma transparente `monto_pagado`, `monto_pendiente`, `metodo_pago` (`"mixto"` o el método individual) y el `estado` (`pagado`, `parcialmente_pagado` o `separado`).

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
Métricas en tiempo real del evento activo seleccionado en el header, distribuidas en una fila limpia y equilibrada de 5 tarjetas clave:

| KPI | Descripción |
|---|---|
| **Matriculados con Boleto** | Cantidad de alumnos del padrón oficial que ya compraron y % de cobertura alcanzada |
| **Total Boletos** | Total de boletos físicos registrados en el evento |
| **Recaudado Cobrado** | Suma total de dinero real ingresado a caja (`monto_pagado`) |
| **Saldo Pendiente** | Monto pendiente total por cobrar a los compradores (`monto_pendiente`) |
| **Boletos Pagados (100%)** | Boletos con estado `pagado` (totalmente saldados) |

Botones de acción disponibles:
- **Actualizar** — recarga KPIs y tabla de boletos.
- **Importar** — modal para subir archivos `.xlsx` o `.csv` (modo combinar o reemplazar).
- **Exportar Excel** y **Exportar CSV** — descarga con desglose de métodos de pago.

**Tabla de Registro de Boletos Físicos:**
- Ocupa el **100% del ancho** del panel principal en su propio contenedor responsivo.
- Ajuste automático de texto (`word-break` y `white-space: normal`) para columnas extensas (*Comprador, Carrera/Ciclo, Recolector*).
- Valores numéricos, fechas y estados con etiquetas semáforo protegidos sin saltos de línea extraños.
- Buscador reactivo en tiempo real por número de boleto, código, nombre o recolector.

### Nueva Venta
- Autocompletado reactivo de estudiante por código (6 cifras) o nombre (debounce 150ms).
- Venta masiva de 1 a 20 boletos en una sola transacción asignando números correlativos.
- Asignación de persona que recoge (referencial) por cada boleto emitido.
- **Gestión Dinámica de Pagos:**
  - Botón **"Agregar método de pago"** para desglosar múltiples abonos (ej. S/5 Efectivo + S/10 Plin).
  - Métodos disponibles: `Efectivo`, `Yape` y `Plin`.
  - Panel de resumen en vivo que calcula automáticamente: **Total pagado**, **Saldo pendiente** y el **Estado** resultante (`Pagado`, `Parcial` o `Separado`).
- Resumen visual con desglose de boletos asignados tras confirmar la venta.

### Entrega de Polladas
- Búsqueda instantánea por número físico de boleto (#1 a #1000), código, DNI o nombre.
- Alerta visual destacada si el boleto cuenta con saldo pendiente.
- Modal de confirmación en puerta con opción de registrar el cobro del saldo (añadiéndolo automáticamente a los pagos) con fecha/hora registrada en **Hora Peruana (UTC-5)**.

### Editar Boleto
- Búsqueda rápida de boletos registrados.
- Modal de edición completo: modifica datos personales, asignación de recolector, estado de entrega física o precio.
- **Edición Dinámica de Pagos:** Permite agregar o remover métodos de pago de un boleto existente, recalculando los totales al instante al guardar cambios.

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
# 1. Archivos principales del backend y modelos
scp -i $env:USERPROFILE\.ssh\id_ed25519_vps `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\app\main.py" `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\app\database.py" `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\app\models.py" `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\app\schemas.py" `
  root@161.132.39.114:~/sistemas/sistema-tickets-polladas/app/

# 2. Routers con la lógica de pagos y exportación
scp -i $env:USERPROFILE\.ssh\id_ed25519_vps `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\app\routers\tickets.py" `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\app\routers\eventos.py" `
  root@161.132.39.114:~/sistemas/sistema-tickets-polladas/app/routers/

# 3. Archivos de frontend (UI dinámica y estilos)
scp -i $env:USERPROFILE\.ssh\id_ed25519_vps `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\frontend\index.html" `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\frontend\app.js" `
  "d:\Apps-gianmarcoax\2026_SIS_DECIMO\sistema-tickets-polladas\frontend\styles.css" `
  root@161.132.39.114:~/sistemas/sistema-tickets-polladas/frontend/

# 4. Reiniciar el contenedor
ssh -i $env:USERPROFILE\.ssh\id_ed25519_vps root@161.132.39.114 `
  "cd ~/sistemas/sistema-tickets-polladas && docker compose restart"
```

> Al reiniciar, `database.py` aplicará automáticamente la migración de columna `pagos_detalle` sin tocar los datos existentes. Si se agregan paquetes a `requirements.txt`, usar `docker compose up -d --build` en lugar de `restart`.

---

## 11. Importar y Exportar datos

### Exportar
Dashboard → **Exportar Excel** o **Exportar CSV** — genera el reporte contable completo del evento activo.

**Desglose Contable por Método (Denormalizado):**
Si un boleto fue abonado con métodos mixtos (por ejemplo, S/ 5.00 en Efectivo y S/ 10.00 en Plin), el reporte genera **una fila independiente por cada pago realizado**. De esta forma:
- Se puede aplicar un filtro o tabla dinámica por `Método de Pago` para cuadrar la caja física (Efectivo) por separado de la billetera virtual (Yape y Plin).
- El saldo pendiente solo se imputa a la primera fila del boleto para no duplicar deudas al sumar la columna.

**Columnas del reporte exportado:**

| Columna | Ejemplo | Descripción |
|---|---|---|
| Nº Boleto | 101 | Identificador físico |
| Código / DNI | 247358 | Identificador del estudiante |
| Nombre Comprador | Juan Pérez | Nombre completo |
| Carrera | INGENIERIA DE SISTEMAS | Escuela profesional |
| Ciclo | 10 | Ciclo académico |
| Persona que Recoge | Pedro | Referencial de entrega |
| Estado | PAGADO | Semáforo de pago |
| Monto Total (S/) | 15.00 | Costo total del boleto |
| Monto Pagado (S/) | 5.00 | Monto correspondiente a ese método específico |
| Monto Pendiente (S/) | 0.00 | Saldo restante por cancelar |
| Método de Pago | EFECTIVO | Método del abono (`EFECTIVO`, `YAPE` o `PLIN`) |
| Entregado | Sí | Si se entregó la vianda física |
| Fecha de Entrega | 2026-09-04 10:30:00 | Hora peruana de entrega |

### Importar
Dashboard → botón **Importar** → seleccionar archivo y modo.

**Modos:**
- **Combinar**: agrega nuevos y actualiza los existentes por Nº Boleto. No borra nada.
- **Reemplazar todo**: borra todos los boletos del evento y los carga desde el archivo.

**Flujo recomendado para sincronizar datos con la VPS:**
1. Exportar el Excel actual como backup de seguridad.
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

- **Frontend sin dependencias pesadas:** HTML5 + CSS puro + JavaScript Vanilla para asegurar máxima velocidad y compatibilidad en dispositivos móviles.
- **Zona Horaria de Perú (UTC-5):** Implementada mediante el helper `ahora_peru()` en el backend, garantizando que el registro de entregas físicas y pagos en puerta conserve siempre la hora local de Perú (`America/Lima`) sin importar la zona configurada en el servidor o contenedor.
- **Soporte de Pagos Mixtos y Retrocompatibilidad:** La columna `pagos_detalle` almacena la lista JSON como fuente de la verdad, mientras que `monto_pagado` y `metodo_pago` se calculan dinámicamente como campos agregados para compatibilidad total con endpoints o reportes previos.
- **Formato Numérico en Excel:** Se utiliza el formato universal `#,##0.00` en `openpyxl` para asegurar que las columnas monetarias sean reconocidas como números sumables en cualquier versión o idioma de Microsoft Excel.
- **Modo Uvicorn:** `reload=False` en producción local y VPS para evitar procesos huérfanos que provocan errores `405 Method Not Allowed` en peticiones `PATCH`.
- **Restricción de integridad única:** `(evento_id, numero_boleto)` previene la duplicación accidental de boletos físicos numerados.

---

*Sistema de Gestión de Boletos — Documentación v2.1 — Actualizado con Pagos Múltiples, Responsividad y Zona Horaria Perú*
