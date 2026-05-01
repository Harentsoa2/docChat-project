import asyncio
import os
from typing import List, Optional
from uuid import UUID

import requests
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Document, Project
from pipeline import (
    delete_vectors_for_document,
    delete_vectors_for_project,
    process_document_from_url,
)
from schemas import (
    DeleteDocumentResponse,
    DeleteProjectResponse,
    DocumentCreate,
    DocumentStatus,
    ProjectCreate,
)

UPLOADTHING_API_KEY = os.getenv("UPLOADTHING_SECRET") or os.getenv("UPLOADTHING_API_KEY")
UPLOADTHING_BASE_URL = os.getenv("UPLOADTHING_API_URL", "https://api.uploadthing.com")


class ProjectNotFoundError(Exception):
    pass


class DocumentNotFoundError(Exception):
    pass


class DuplicateDocumentKeyError(Exception):
    pass


class ExternalDeletionError(Exception):
    pass


def _delete_uploadthing_file(file_key: str) -> bool:
    if not file_key:
        return False
    if not UPLOADTHING_API_KEY:
        raise ExternalDeletionError("UPLOADTHING_SECRET (or UPLOADTHING_API_KEY) is not configured")

    response = requests.post(
        f"{UPLOADTHING_BASE_URL}/v6/deleteFiles",
        headers={
            "x-uploadthing-api-key": UPLOADTHING_API_KEY,
            "content-type": "application/json",
        },
        json={"fileKeys": [file_key]},
        timeout=30,
    )

    if response.status_code in (200, 201, 204, 404):
        return True

    raise ExternalDeletionError(
        f"UploadThing deletion failed for file_key={file_key} "
        f"(status={response.status_code}, body={response.text[:500]})"
    )


def create_project(db: Session, payload: ProjectCreate) -> Project:
    project = Project(name=payload.name, description=payload.description)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def list_projects(db: Session) -> List[Project]:
    return db.query(Project).order_by(Project.created_at.desc()).all()


def get_project(db: Session, project_id: UUID) -> Optional[Project]:
    return db.query(Project).filter(Project.id == project_id).first()


def require_project(db: Session, project_id: UUID) -> Project:
    project = get_project(db, project_id)
    if not project:
        raise ProjectNotFoundError(f"Project {project_id} was not found")
    return project


def create_document_registration(db: Session, payload: DocumentCreate) -> Document:
    require_project(db, payload.project_id)

    document = Document(
        project_id=payload.project_id,
        filename=payload.filename,
        file_url=str(payload.file_url),
        file_key=payload.file_key,
        status=DocumentStatus.PROCESSING.value,
    )

    try:
        db.add(document)
        db.commit()
        db.refresh(document)
    except IntegrityError as exc:
        db.rollback()
        raise DuplicateDocumentKeyError("UploadThing file_key already exists") from exc

    return document


def list_documents_for_project(db: Session, project_id: UUID) -> List[Document]:
    require_project(db, project_id)
    return (
        db.query(Document)
        .filter(Document.project_id == project_id)
        .order_by(Document.created_at.desc())
        .all()
    )


def get_document(db: Session, document_id: UUID) -> Optional[Document]:
    return db.query(Document).filter(Document.id == document_id).first()


def require_document(db: Session, document_id: UUID) -> Document:
    document = get_document(db, document_id)
    if not document:
        raise DocumentNotFoundError(f"Document {document_id} was not found")
    return document


def mark_document_status(
    db: Session,
    document_id: UUID,
    status: DocumentStatus,
    error_message: Optional[str] = None,
) -> None:
    document = get_document(db, document_id)
    if not document:
        return

    document.status = status.value
    document.error_message = error_message
    db.commit()


def process_document_background(document_id: UUID) -> None:
    db = SessionLocal()
    try:
        document = get_document(db, document_id)
        if not document:
            return

        project_id = document.project_id
        file_url = document.file_url
        filename = document.filename

        mark_document_status(db, document_id, DocumentStatus.PROCESSING)
        asyncio.run(process_document_from_url(file_url, project_id, document_id, filename))
        mark_document_status(db, document_id, DocumentStatus.READY)
    except Exception as exc:
        db.rollback()
        mark_document_status(db, document_id, DocumentStatus.ERROR, str(exc))
    finally:
        db.close()


def delete_document_with_external_resources(
    db: Session,
    document_id: UUID,
) -> DeleteDocumentResponse:
    document = require_document(db, document_id)
    uploadthing_deleted = _delete_uploadthing_file(document.file_key)
    delete_vectors_for_document(document.project_id, document.id)

    project_id = document.project_id
    db.delete(document)
    db.commit()

    return DeleteDocumentResponse(
        deleted=True,
        document_id=document_id,
        project_id=project_id,
        uploadthing_deleted=uploadthing_deleted,
        pinecone_deleted=True,
    )


def delete_project_with_external_resources(
    db: Session,
    project_id: UUID,
) -> DeleteProjectResponse:
    project = require_project(db, project_id)
    documents = db.query(Document).filter(Document.project_id == project_id).all()

    deleted_uploadthing_files = 0
    for document in documents:
        if _delete_uploadthing_file(document.file_key):
            deleted_uploadthing_files += 1

    delete_vectors_for_project(project_id)

    documents_count = len(documents)
    db.delete(project)
    db.commit()

    return DeleteProjectResponse(
        deleted=True,
        project_id=project_id,
        documents_deleted=documents_count,
        uploadthing_files_deleted=deleted_uploadthing_files,
        pinecone_deleted=True,
    )
