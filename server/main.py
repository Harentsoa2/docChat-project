import json
import os
from contextlib import asynccontextmanager
from typing import List
from uuid import UUID

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import get_db, init_db
from models import ChatMessage
from pipeline import query_project
from schemas import (
    ChatMessageResponse,
    ChatResponse,
    DeleteDocumentResponse,
    DeleteProjectResponse,
    DocumentCreate,
    DocumentResponse,
    MessageCreate,
    ProjectCreate,
    ProjectDocumentCreate,
    ProjectResponse,
)
from services import (
    DocumentNotFoundError,
    DuplicateDocumentKeyError,
    ExternalDeletionError,
    ProjectNotFoundError,
    create_document_registration,
    create_project,
    delete_document_with_external_resources,
    delete_project_with_external_resources,
    list_documents_for_project,
    list_projects,
    process_document_background,
    require_document,
    require_project,
)

DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://doc-chat-project-06.vercel.app",
]


def get_cors_origins() -> List[str]:
    raw_origins = os.getenv("CORS_ALLOW_ORIGINS") or os.getenv("ALLOWED_ORIGINS")
    if not raw_origins:
        return DEFAULT_CORS_ORIGINS

    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Chat with Document API",
    description="Project-scoped document registration using UploadThing file metadata.",
    lifespan=lifespan,
)


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


def _enqueue_registered_document(
    payload: DocumentCreate,
    background_tasks: BackgroundTasks,
    db: Session,
):
    try:
        document = create_document_registration(db, payload)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except DuplicateDocumentKeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A document with this UploadThing file_key already exists",
        ) from exc

    background_tasks.add_task(process_document_background, document.id)
    return document


@app.post(
    "/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project_endpoint(project: ProjectCreate, db: Session = Depends(get_db)):
    return create_project(db, project)


@app.get("/projects", response_model=List[ProjectResponse])
def list_projects_endpoint(db: Session = Depends(get_db)):
    return list_projects(db)


@app.post(
    "/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def register_uploadthing_document(
    payload: DocumentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    return _enqueue_registered_document(payload, background_tasks, db)


@app.post(
    "/projects/{project_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def register_project_uploadthing_document(
    project_id: UUID,
    payload: ProjectDocumentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    document_payload = DocumentCreate(project_id=project_id, **payload.model_dump())
    return _enqueue_registered_document(document_payload, background_tasks, db)


@app.get("/projects/{project_id}/documents", response_model=List[DocumentResponse])
def list_documents(project_id: UUID, db: Session = Depends(get_db)):
    try:
        return list_documents_for_project(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@app.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document_status(document_id: UUID, db: Session = Depends(get_db)):
    try:
        return require_document(db, document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@app.delete("/documents/{document_id}", response_model=DeleteDocumentResponse)
def delete_document(document_id: UUID, db: Session = Depends(get_db)):
    try:
        return delete_document_with_external_resources(db, document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ExternalDeletionError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@app.delete("/projects/{project_id}", response_model=DeleteProjectResponse)
def delete_project(project_id: UUID, db: Session = Depends(get_db)):
    try:
        return delete_project_with_external_resources(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ExternalDeletionError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@app.get("/projects/{project_id}/messages", response_model=List[ChatMessageResponse])
def list_project_messages(project_id: UUID, db: Session = Depends(get_db)):
    try:
        require_project(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    return (
        db.query(ChatMessage)
        .filter(ChatMessage.project_id == project_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )


@app.post("/projects/{project_id}/chat", response_model=ChatResponse)
async def chat_with_project(
    project_id: UUID,
    message: MessageCreate,
    db: Session = Depends(get_db),
):
    try:
        require_project(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.project_id == project_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    chat_history = [{"role": item.role, "content": item.content} for item in history]

    result = await query_project(project_id, message.content, chat_history)

    db.add(ChatMessage(project_id=project_id, role="user", content=message.content))
    db.add(
        ChatMessage(
            project_id=project_id,
            role="assistant",
            content=result["answer"],
            sources=json.dumps(result["sources"]),
        )
    )
    db.commit()

    return result


app = CORSMiddleware(
    app,
    allow_origins=get_cors_origins(),
    allow_origin_regex=os.getenv("CORS_ALLOW_ORIGIN_REGEX"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port
    )
