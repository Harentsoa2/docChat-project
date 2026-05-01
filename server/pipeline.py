import os
import tempfile
from typing import Dict, List
from uuid import UUID

import requests
from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pinecone import Pinecone, ServerlessSpec
from unstructured.chunking.title import chunk_by_title
from unstructured.partition.pdf import partition_pdf

load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "chat-docs")

_pinecone_client = None
_embeddings = None
_llm = None


def get_pinecone_client():
    global _pinecone_client
    if not PINECONE_API_KEY:
        raise RuntimeError("PINECONE_API_KEY is not configured")
    if _pinecone_client is None:
        _pinecone_client = Pinecone(api_key=PINECONE_API_KEY)
    return _pinecone_client


def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    return _embeddings


def get_llm():
    global _llm
    if _llm is None:
        _llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    return _llm


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


async def process_document_from_url(
    file_url: str,
    project_id: UUID,
    document_id: UUID,
    filename: str,
):
    """Download the UploadThing file and index it for project-scoped RAG."""
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            response = requests.get(file_url, timeout=60)
            response.raise_for_status()
            tmp_file.write(response.content)
            tmp_path = tmp_file.name

        elements = partition_pdf(
            filename=tmp_path,
            strategy="hi_res",
            infer_table_structure=True,
            extract_image_block_types=["Image"],
            extract_image_block_to_payload=True,
        )

        chunks = chunk_by_title(
            elements,
            max_characters=3000,
            new_after_n_chars=2400,
            combine_text_under_n_chars=500,
        )

        index = init_pinecone()
        embeddings = get_embeddings()
        vectors = []

        for i, chunk in enumerate(chunks):
            content = chunk.text
            metadata = chunk.metadata.to_dict()
            embedding = await embeddings.aembed_query(content)

            vectors.append(
                {
                    "id": f"proj_{project_id}_doc_{document_id}_chunk_{i}",
                    "values": embedding,
                    "metadata": {
                        "project_id": str(project_id),
                        "document_id": str(document_id),
                        "text": content,
                        "page_number": metadata.get("page_number", 1),
                        "filename": filename,
                        "file_url": file_url,
                    },
                }
            )

            if len(vectors) >= 100:
                index.upsert(vectors=vectors)
                vectors = []

        if vectors:
            index.upsert(vectors=vectors)

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
    embeddings = get_embeddings()
    llm = get_llm()

    query_embedding = await embeddings.aembed_query(query)

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

    messages = [SystemMessage(content=system_prompt)]
    if chat_history:
        for message in chat_history:
            role = message["role"]
            content = message["content"]
            if role == "user":
                messages.append(HumanMessage(content=content))
            else:
                messages.append(SystemMessage(content=content))

    messages.append(HumanMessage(content=query))
    response = await llm.ainvoke(messages)

    return {
        "answer": response.content,
        "sources": sources,
    }
