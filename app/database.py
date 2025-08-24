# app/database.py

from sqlalchemy import create_engine, Column, Integer, String, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import settings  # Load konfigurasi dari .env via Pydantic

DATABASE_URL = (
    f"postgresql://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
    f"@{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Tambahan baru (untuk schema dinamis)
class DataSchema(Base):
    __tablename__ = "data_schemas"

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String, unique=True, index=True)
    schema = Column(JSON)  # simpan definisi kolom dalam bentuk JSON


def init_db():
    Base.metadata.create_all(bind=engine)