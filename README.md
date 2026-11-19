# Backend - FastAPI + PostgreSQL + Airflow

## Deskripsi

Backend ini dibangun dengan FastAPI sebagai API server, PostgreSQL sebagai database utama, dan Apache Airflow untuk orkestrasi dan sinkronisasi data. Backend menangani autentikasi user, upload CSV dinamis, validasi data, penyimpanan ke database, serta manajemen user dan data.

## Fitur Utama

- FastAPI dengan autentikasi JWT (login, register, refresh token)
- PostgreSQL untuk penyimpanan data dan metadata upload
- Endpoint untuk upload CSV, download template, lihat dan hapus data
- Role-based access control (admin & user)
- Airflow DAG untuk sinkronisasi data ke tabel utama secara otomatis
- Pengelolaan user dengan approval dari admin



