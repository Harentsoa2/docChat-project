import os
import re
import tempfile
from typing import Dict, Iterator, List
from uuid import UUID

from pypdf import PdfReader
import requests
from dotenv import load_dotenv
from openai import AsyncOpenAI
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "chat-docs")
PDF_CHUNK_MAX_CHARS = int(os.getenv("PDF_CHUNK_MAX_CHARS", "3000"))
PDF_CHUNK_OVERLAP_CHARS = int(os.getenv("PDF_CHUNK_OVERLAP_CHARS", "300"))
PDF_VECTOR_BATCH_SIZE = int(os.getenv("PDF_VECTOR_BATCH_SIZE", "50"))

_pinecone_client = None
_openai_client = None


def get_pinecone_client():
    global _pinecone_client
    if not PINECONE_API_KEY:
        raise RuntimeError("PINECONE_API_KEY is not configured")
    if _pinecone_client is None:
        _pinecone_client = Pinecone(api_key=PINECONE_API_KEY)
    return _pinecone_client


def get_openai_client():
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI()
    return _openai_client


async def embed_text(text: str) -> List[float]:
    response = await get_openai_client().embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


async def generate_answer(messages: List[Dict]) -> str:
    response = await get_openai_client().chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=messages,
    )
    return response.choices[0].message.content or ""


def init_pinecone():
    pc = get_pinecone_client()
    if PINECONE_INDEX_NAME not in pc.list_indexes().names():
        pc.create_index(
            name=PINECONE_INDEX_NAME,
            dimension=1536,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
    return pc.Index(PINECONE_INDEX_NAME)


def delete_vectors_for_document(project_id: UUID, document_id: UUID) -> None:
    """Delete all vectors for one document."""
    index = init_pinecone()
    index.delete(
        filter={
            "project_id": {"$eq": str(project_id)},
            "document_id": {"$eq": str(document_id)},
        }
    )


def delete_vectors_for_project(project_id: UUID) -> None:
    """Delete all vectors for one project."""
    index = init_pinecone()
    index.delete(filter={"project_id": {"$eq": str(project_id)}})


def _download_pdf_to_tempfile(file_url: str) -> str:
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
        with requests.get(file_url, timeout=60, stream=True) as response:
            response.raise_for_status()
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    tmp_file.write(chunk)
        return tmp_file.name


def _clean_pdf_text(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _split_text(text: str) -> List[str]:
    text = _clean_pdf_text(text)
    if not text:
        return []

    max_chars = max(PDF_CHUNK_MAX_CHARS, 500)
    overlap = min(max(PDF_CHUNK_OVERLAP_CHARS, 0), max_chars // 3)
    chunks = []
    start = 0

    while start < len(text):
        end = min(start + max_chars, len(text))

        if end < len(text):
            min_cut = start + max_chars // 2
            cut_points = [
                text.rfind("\n\n", min_cut, end),
                text.rfind("\n", min_cut, end),
                text.rfind(". ", min_cut, end),
                text.rfind(" ", min_cut, end),
            ]
            cut = max(cut_points)
            if cut > start:
                end = cut + 1

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        start = max(end - overlap, start + 1)

    return chunks


def _iter_pdf_chunks(pdf_path: str) -> Iterator[Dict]:
    reader = PdfReader(pdf_path)
    if reader.is_encrypted:
        decrypt_result = reader.decrypt("")
        if decrypt_result == 0:
            raise RuntimeError("PDF is encrypted and cannot be read without a password")

    for page_number, page in enumerate(reader.pages, start=1):
        page_text = _clean_pdf_text(page.extract_text() or "")
        for content in _split_text(page_text):
            yield {
                "content": content,
                "page_number": page_number,
            }


async def process_document_from_url(
    file_url: str,
    project_id: UUID,
    document_id: UUID,
    filename: str,
):
    """Download the UploadThing file and index it for project-scoped RAG."""
    tmp_path = None
    try:
        tmp_path = _download_pdf_to_tempfile(file_url)

        index = None
        vectors = []
        chunk_count = 0

        for i, chunk in enumerate(_iter_pdf_chunks(tmp_path)):
            if index is None:
                index = init_pinecone()

            chunk_count += 1
            content = chunk["content"]
            embedding = await embed_text(content)

            vectors.append(
                {
                    "id": f"proj_{project_id}_doc_{document_id}_chunk_{i}",
                    "values": embedding,
                    "metadata": {
                        "project_id": str(project_id),
                        "document_id": str(document_id),
                        "text": content,
                        "page_number": chunk["page_number"],
                        "filename": filename,
                        "file_url": file_url,
                    },
                }
            )

            if len(vectors) >= PDF_VECTOR_BATCH_SIZE:
                index.upsert(vectors=vectors)
                vectors = []

        if vectors:
            index.upsert(vectors=vectors)

        if chunk_count == 0:
            raise RuntimeError(
                "No extractable text found in PDF. Scanned PDFs and image-only pages are not processed."
            )

        return True
    except Exception as exc:
        print(f"Error processing document {document_id}: {str(exc)}")
        raise
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


async def query_project(
    project_id: UUID,
    query: str,
    chat_history: List[Dict] = None,
):
    """Search project vectors and generate an answer with citations."""
    index = init_pinecone()

    query_embedding = await embed_text(query)

    results = index.query(
        vector=query_embedding,
        top_k=5,
        filter={"project_id": {"$eq": str(project_id)}},
        include_metadata=True,
    )

    context_parts = []
    sources = []
    for result in results["matches"]:
        metadata = result["metadata"]
        context_parts.append(metadata["text"])
        sources.append(
            {
                "document": metadata["filename"],
                "page": metadata["page_number"],
                "content": metadata["text"][:200] + "...",
            }
        )

    context = "\n\n---\n\n".join(context_parts)
    system_prompt = f"""Tu es un assistant expert qui repond aux questions en te basant exclusivement sur le contexte fourni.
Si la reponse n'est pas dans le contexte, dis que tu ne sais pas.
Cite toujours tes sources.

CONTEXTE:
{context}
"""

    messages = [{"role": "system", "content": system_prompt}]
    if chat_history:
        for message in chat_history:
            role = message["role"]
            content = message["content"]
            if role == "user":
                messages.append({"role": "user", "content": content})
            elif role == "assistant":
                messages.append({"role": "assistant", "content": content})

    messages.append({"role": "user", "content": query})
    answer = await generate_answer(messages)

    return {
        "answer": answer,
        "sources": sources,
    }
