import os
from collections.abc import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from models import Base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not configured")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    migrate_legacy_schema()


def migrate_legacy_schema() -> None:
    """Keep old Render databases compatible with the current API models."""
    with engine.begin() as connection:
        inspector = inspect(connection)
        if "documents" not in inspector.get_table_names():
            return

        columns = {column["name"] for column in inspector.get_columns("documents")}

        if "filename" not in columns and "name" in columns:
            connection.execute(text("ALTER TABLE documents RENAME COLUMN name TO filename"))
            columns.remove("name")
            columns.add("filename")

        if "file_url" not in columns and "url" in columns:
            connection.execute(text("ALTER TABLE documents RENAME COLUMN url TO file_url"))
            columns.remove("url")
            columns.add("file_url")

        if "file_key" not in columns and "upload_key" in columns:
            connection.execute(text("ALTER TABLE documents RENAME COLUMN upload_key TO file_key"))
            columns.remove("upload_key")
            columns.add("file_key")

        if "error_message" not in columns:
            connection.execute(text("ALTER TABLE documents ADD COLUMN error_message TEXT"))

        connection.execute(text("UPDATE documents SET status = 'error' WHERE status = 'failed'"))
        connection.execute(
            text(
                """
                UPDATE documents
                SET status = 'ready'
                WHERE status IN ('complete', 'completed', 'done', 'indexed', 'processed')
                """
            )
        )


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
