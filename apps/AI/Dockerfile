FROM python:3.11-slim

# Install system dependencies for WeasyPrint, fonts, Playwright, and ML packages.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    python3-cffi \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    fonts-liberation \
    fontconfig \
    libglib2.0-0 \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

# Azure Container Apps is CPU-only for this deployment. Install PyTorch from
# the official CPU wheel index first so the generic `torch>=2.1.0` requirement
# is already satisfied and pip does not pull multi-gigabyte CUDA/NVIDIA wheels.
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu "torch>=2.1.0" \
    && pip install --no-cache-dir -r requirements.txt

ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright
ENV LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:/usr/lib
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY . .

# Install Chromium and the OS libraries required by Playwright PDF fallback.
RUN apt-get update \
    && playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/* /root/.cache/pip

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
