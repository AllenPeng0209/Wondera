# Wondera Backend - FastAPI
FROM python:3.10-slim

WORKDIR /app

# 依賴先裝，利用層快取
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 應用程式
COPY app/ ./app/
COPY seed/ ./seed/

# 非 root 執行（可選，依部署環境調整）
# RUN adduser --disabled-password appuser && chown -R appuser:appuser /app
# USER appuser

EXPOSE 8000

# 預設用 uvicorn，可被 docker run / compose 覆寫
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
