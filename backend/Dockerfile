FROM python:3.10-slim

# System libs OpenCV needs at runtime.
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Spaces run the container as UID 1000. Create that user and give
# it a writable HOME so TensorFlow/Keras/Matplotlib can write their caches.
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    LEAF_CROP=1

WORKDIR /app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user . .

USER user

# Must match `app_port` in README.md's Hugging Face front matter.
EXPOSE 8000

# Cloud Run injects $PORT (8080) and ignores EXPOSE; everywhere else defaults to
# 8000. Shell form so ${PORT} is expanded at runtime.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
