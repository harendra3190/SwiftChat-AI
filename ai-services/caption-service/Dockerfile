FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt
COPY . .
WORKDIR /app/caption-service
CMD ["python", "main.py"]
