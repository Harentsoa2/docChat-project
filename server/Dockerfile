FROM python:3.10-slim

RUN pip install --upgrade pip
# Installer dépendances système
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    tesseract-ocr \
    libmagic1 \
    build-essential \
    gcc \
    g++ \
    libxml2-dev \
    libxslt1-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Dossier app
WORKDIR /app

# Copier fichiers
COPY . .

# Installer dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Lancer app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]