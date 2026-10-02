from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Engine configuration with dialect detection
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """FastAPI database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables in database if they don't already exist and applies schema migrations"""
    import app.models.models  # Register all SQLAlchemy models
    Base.metadata.create_all(bind=engine)

    # Check and migrate columns dynamically for existing SQLite/MySQL databases
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check documents.file_type column
            try:
                conn.execute(text("SELECT file_type FROM documents LIMIT 1"))
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN file_type VARCHAR(50) DEFAULT 'pdf'"))
                    conn.commit()
                    print("[DB Migration] Added missing column 'file_type' to documents table.")
                except Exception as ex:
                    print(f"[DB Migration] Notice on file_type column migration: {ex}")

            # Check document_analyses.debug_info column
            try:
                conn.execute(text("SELECT debug_info FROM document_analyses LIMIT 1"))
            except Exception:
                try:
                    conn.execute(text("ALTER TABLE document_analyses ADD COLUMN debug_info TEXT"))
                    conn.commit()
                    print("[DB Migration] Added missing column 'debug_info' to document_analyses table.")
                except Exception as ex:
                    print(f"[DB Migration] Notice on debug_info column migration: {ex}")
    except Exception as e:
        print(f"[DB Migration] Notice: {e}")

