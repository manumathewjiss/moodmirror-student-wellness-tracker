FROM python:3.11-slim

# HuggingFace Spaces requires a non-root user with UID 1000
RUN useradd -m -u 1000 appuser

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
# Cache HuggingFace model downloads inside the container
ENV HF_HOME=/app/.cache/huggingface

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app /app/app

RUN chown -R appuser:appuser /app
USER appuser

# HuggingFace Spaces requires port 7860
EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
