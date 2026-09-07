import os
from sqlalchemy import create_engine
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
