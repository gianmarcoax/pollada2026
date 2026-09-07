# Imagen base oficial de Python 3.11 slim
FROM python:3.11-slim

# Variables de entorno para evitar archivos .pyc y logs buffereados
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar primero solo requirements para aprovechar la caché de Docker
COPY requirements.txt .

# Instalar dependencias
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar todo el proyecto
COPY . .

# Crear directorio de archivos estáticos (por si no existe)
RUN mkdir -p /app/static

# Exponer el puerto interno de la aplicación
EXPOSE 8000

# Comando de inicio: compatible con Railway ($PORT dinámico) y VPS/Docker local (8000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
