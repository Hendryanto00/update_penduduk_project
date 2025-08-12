# Backend - FastAPI + PostgreSQL + Airflow

## Deskripsi

Backend ini dibangun dengan FastAPI sebagai API server, PostgreSQL sebagai database utama, dan Apache Airflow untuk orkestrasi dan sinkronisasi data. Backend menangani autentikasi user, upload CSV dinamis, validasi data, penyimpanan ke database, serta manajemen user dan data.

## Fitur Utama

- FastAPI dengan autentikasi JWT (login, register, refresh token)
- PostgreSQL untuk penyimpanan data dan metadata upload
- Auto-create tabel dan template CSV berdasarkan jenis data baru
- Endpoint untuk upload CSV, download template, lihat dan hapus data
- Role-based access control (admin & user)
- Airflow DAG untuk sinkronisasi data ke tabel utama secara otomatis
- Pengelolaan user dengan approval dari admin

## Instalasi dan Menjalankan

1. Clone repository:
    - git clone url-backend 
    - cd folder-backend

2. Buat file .env seperti di kode .env.example

3. Jalankan seluruh service dengan Docker Compose:
    - docker-compose up --build
Service yang berjalan:
    - PostgreSQL database pada port 5432
    - FastAPI backend pada port 8000
    - Airflow Webserver pada port 8081
    - Airflow Scheduler (internal)
    - PgAdmin UI pada port 8082

4. Akses layanan:
    - API FastAPI: http://localhost:8000
    - Airflow Web UI: http://localhost:8081
    - PgAdmin UI: http://localhost:8082
