FROM python:3.10-slim

# Install system dependencies (ffmpeg, nodejs)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    git \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install frontend dependencies and build
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Install Python dependencies
COPY backend/requirements.txt ./backend/
# We need to install specific torch versions if we want CPU/GPU support without bloated layers,
# but for simplicity we will just pip install the requirements.
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the rest of the application
COPY backend/ ./backend/

# Hugging Face runs on port 7860
EXPOSE 7860

# We need to make sure the user has permissions for the AutoCapsData directory
RUN mkdir -p /root/AutoCapsData && chmod 777 /root/AutoCapsData

# Set environment variables
ENV HOST="0.0.0.0"
ENV PORT="7860"

# Start both FastAPI (backend) and Next.js (frontend)
CMD ["bash", "-c", "cd backend && uvicorn main:app --host 127.0.0.1 --port 7860 & cd frontend && npm run start -- -p ${PORT:-3000} -H 0.0.0.0"]
