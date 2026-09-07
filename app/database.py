import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# En Docker usa la ruta del volumen; en local usa el archivo del directorio actual
_db_path = os.environ.get("DATABASE_PATH", "./sistema_tickets.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{_db_path}"

# connect_args={"check_same_thread": False} es necesario para SQLite en FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def run_migrations():
    """
    Aplica columnas nuevas a tablas existentes sin perder datos.
    SQLite no soporta ALTER TABLE DROP COLUMN, pero sí ADD COLUMN.
    Se ejecuta automáticamente en el arranque de la app.
    """
    migrations = [
        # tabla, columna, definición SQL
        ("tickets", "pagos_detalle", "TEXT NOT NULL DEFAULT '[]'"),
    ]
    with engine.connect() as conn:
        for table, column, definition in migrations:
            # Verificar si la columna ya existe
            result = conn.execute(text(f"PRAGMA table_info({table})"))
            existing_cols = [row[1] for row in result.fetchall()]
            if column not in existing_cols:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {definition}"))
                conn.commit()
                print(f"[Migration] Columna '{column}' agregada a tabla '{table}'")
