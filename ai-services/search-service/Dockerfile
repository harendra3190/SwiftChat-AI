FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN apt-get update && apt-get install -y libpq-dev gcc && pip install --default-timeout=1000 --no-cache-dir -r requirements.txt
COPY . .
WORKDIR /app/search-service
CMD ["python", "main.py"]
