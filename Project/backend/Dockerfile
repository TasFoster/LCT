# Контекст сборки — корень репозитория (docker-compose.yml), не Project/backend:
# catalog/loader.py читает Датасет/Датасет/catalog_export_v4.csv по пути на 3
# уровня выше своего файла (../../../Датасет), т.е. ожидает Project/ и Датасет/
# соседями — тот же расклад нужно сохранить и в образе.
FROM python:3.12-slim

WORKDIR /app

COPY Project/backend/requirements.txt Project/backend/requirements.txt
RUN pip install --no-cache-dir -r Project/backend/requirements.txt

COPY Project/backend Project/backend
COPY Датасет Датасет

WORKDIR /app/Project/backend
EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
