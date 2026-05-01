from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: Optional[str]
    created_at: datetime


class DocumentBase(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    file_url: HttpUrl
    file_key: str = Field(min_length=1, max_length=512)

    @field_validator("filename")
    @classmethod
    def validate_pdf_filename(cls, value: str) -> str:
        filename = value.strip()
        if "/" in filename or "\\" in filename:
            raise ValueError("filename must not contain path separators")
        if not filename.lower().endswith(".pdf"):
            raise ValueError("only PDF files are supported")
        return filename

    @field_validator("file_key")
    @classmethod
    def validate_file_key(cls, value: str) -> str:
        file_key = value.strip()
        if not file_key:
            raise ValueError("file_key is required")
        return file_key


class DocumentCreate(DocumentBase):
    project_id: UUID


class ProjectDocumentCreate(DocumentBase):
    pass


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    filename: str
    file_url: str
    file_key: str
    status: DocumentStatus
    error_message: Optional[str]
    created_at: datetime


class MessageCreate(BaseModel):
    content: str = Field(min_length=1)


class ChatResponse(BaseModel):
    answer: str
    sources: List[dict]


class DeleteDocumentResponse(BaseModel):
    deleted: bool
    document_id: UUID
    project_id: UUID
    uploadthing_deleted: bool
    pinecone_deleted: bool


class DeleteProjectResponse(BaseModel):
    deleted: bool
    project_id: UUID
    documents_deleted: int
    uploadthing_files_deleted: int
    pinecone_deleted: bool
