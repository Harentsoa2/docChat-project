# DocChat Full Stack RAG App

DocChat is a full stack document chat application. Users create projects, upload PDF files, wait for the backend to index them, then ask questions against the indexed project documents using a Retrieval-Augmented Generation pipeline.

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn-style UI components, TanStack Query.
- Backend: FastAPI, SQLAlchemy, PostgreSQL.
- File uploads: UploadThing.
- Document parsing: Unstructured, PDF OCR/table/image extraction helpers.
- Vector database: Pinecone.
- AI orchestration: LangChain with OpenAI models.

## Main Features

- Create and delete projects.
- Upload PDF files per project.
- Track document processing status.
- Parse, chunk, embed, and store document content in Pinecone.
- Chat with documents using project-scoped retrieval.
- Return answer sources from retrieved document chunks.
- Delete project/document data from PostgreSQL, UploadThing, and Pinecone.

## RAG Pipeline

```mermaid
flowchart TD
    A[User creates a project] --> B[User uploads a PDF in the Next.js app]
    B --> C[UploadThing stores the PDF]
    C --> D[Frontend receives file_url and file_key]
    D --> E[Frontend registers the document in FastAPI]
    E --> F[PostgreSQL stores document metadata with processing status]
    F --> G[FastAPI background task starts indexing]
    G --> H[Backend downloads the PDF from UploadThing]
    H --> I[Unstructured parses PDF pages, tables, images, and OCR content]
    I --> J[Chunks are created with chunk_by_title]
    J --> K[OpenAI text-embedding-3-small creates embeddings]
    K --> L[Pinecone stores vectors with project_id, document_id, text, page, and file metadata]

    M[User asks a question] --> N[FastAPI /projects/:projectId/chat]
    N --> O[OpenAI embeds the question]
    O --> P[Pinecone retrieves top project-scoped chunks]
    P --> Q[Context, chat history, and question are sent to GPT-4o mini]
    Q --> R[Answer and sources are returned to the frontend]
    R --> S[Chat messages are saved in PostgreSQL]
```

## AI Used

The AI configuration is currently defined in `server/pipeline.py`.

- Embeddings model: `text-embedding-3-small`
- Chat model: `gpt-4o-mini`
- LLM provider: OpenAI, through `langchain-openai`
- Retrieval: Pinecone vector search with cosine similarity
- Generation style: project-scoped RAG. The assistant is instructed to answer only from retrieved context and cite sources.

## Python Dependencies

Backend dependencies are listed in `server/requirements.txt`.

```txt
fastapi[standard]
uvicorn
pydantic-settings
sqlalchemy
psycopg2
unstructured[pdf]
unstructured-inference
langchain
langchain-openai
langchain-community
pinecone
openai
python-dotenv
requests
aiofiles
pycryptodome
pdf2image
pillow
pytesseract
```

Depending on your operating system, PDF parsing and OCR may also require system tools such as Poppler and Tesseract.

## Environment Variables

Create `server/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/chat_docs
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=chat-docs

# Used by the backend when deleting files from UploadThing
UPLOADTHING_SECRET=your_uploadthing_secret
# Optional alternative accepted by the backend:
# UPLOADTHING_API_KEY=your_uploadthing_api_key
# Optional override:
# UPLOADTHING_API_URL=https://api.uploadthing.com
```

Create `client/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# UploadThing SDK credentials for the Next.js upload route
UPLOADTHING_TOKEN=your_uploadthing_token

# Optional callback URL used by client/app/api/uploadthing/route.ts
UPLOADTHING_URL=http://localhost:3000/api/uploadthing
```

## Run Locally

### 1. Start PostgreSQL

Create a PostgreSQL database for the app:

```bash
createdb chat_docs
```

If you use a GUI or Docker for PostgreSQL, just make sure `DATABASE_URL` points to the correct database.

### 2. Run the Backend

```bash
cd server
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# macOS/Linux
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start FastAPI:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

- API: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

The database tables are created automatically when the FastAPI app starts.

### 3. Run the Frontend

Open another terminal:

```bash
cd client
pnpm install
pnpm dev
```

The web app will be available at:

```txt
http://localhost:3000
```

If you prefer npm:

```bash
npm install
npm run dev
```

## Local Usage Flow

1. Open `http://localhost:3000`.
2. Create a project.
3. Open the project.
4. Upload one or more PDF files.
5. Wait until document status becomes `ready`.
6. Open the chat tab.
7. Ask questions about the uploaded documents.

## Backend API Overview

- `POST /projects` creates a project.
- `GET /projects` lists projects.
- `DELETE /projects/{project_id}` deletes a project and its external resources.
- `POST /projects/{project_id}/documents` registers an UploadThing-hosted PDF for a project.
- `GET /projects/{project_id}/documents` lists project documents.
- `GET /documents/{document_id}` checks document processing status.
- `DELETE /documents/{document_id}` deletes one document and its external resources.
- `POST /projects/{project_id}/chat` asks a question against indexed project documents.

## Project Structure

```txt
.
+-- client/                  # Next.js frontend
|   +-- app/                 # App Router pages and API routes
|   +-- components/          # UI, project, document, and chat components
|   +-- lib/api/             # API client functions
+-- server/                  # FastAPI backend
    +-- main.py              # API routes and app setup
    +-- pipeline.py          # RAG indexing and query pipeline
    +-- services.py          # Project/document business logic
    +-- models.py            # SQLAlchemy models
    +-- schemas.py           # Pydantic schemas
    +-- requirements.txt     # Python dependencies
```

## Notes

- Only PDF uploads are accepted.
- Pinecone vectors are filtered by `project_id`, so each chat request only retrieves chunks from the selected project.
- The Pinecone index is created automatically if it does not exist. The configured dimension is `1536`, which matches `text-embedding-3-small`.
- The backend allows CORS from `http://localhost:3000`.
