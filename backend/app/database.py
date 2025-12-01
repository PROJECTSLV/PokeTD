from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings
import os

# Создаем директорию для базы данных, если её нет
db_path = "./game.db"
db_dir = os.path.dirname(db_path)
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)

try:
    engine = create_engine(
        settings.SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}  # Только для SQLite
    )
    print(f"✓ Database engine created: {settings.SQLALCHEMY_DATABASE_URL}")
except Exception as e:
    print(f"✗ Error creating database engine: {e}")
    # Используем in-memory базу данных как fallback
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    print("✓ Using in-memory SQLite database as fallback")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
