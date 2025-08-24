# app_sinkronisasi.py
from fastapi import FastAPI, HTTPException, Path, Body, UploadFile, File, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict
import psycopg2
from datetime import datetime
import json
from difflib import get_close_matches
import csv
from io import StringIO
import re
from math import ceil
from app.routers import dynamic
from app.database import init_db

# 🔐 Autentikasi dan DB
from app.auth.routes import get_current_user
from app.auth.models import User
from app.auth.utils import hash_password
from app.database import Base, engine, SessionLocal
from sqlalchemy.orm import Session
from app.config import settings

# ⚙️ Inisialisasi FastAPI
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], # Ganti dengan daftar asal yang diizinkan
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tambahkan router auth
from app.auth import routes as auth_routes
app.include_router(auth_routes.router)
from app.routers import dynamic
app.include_router(dynamic.router)

# -----------------------------
# Konstanta dan Validasi Umum
# -----------------------------
JENIS_DATA_VALID = {
    "penduduk": ["nik", "nama", "alamat", "kota", "tanggal_lahir", "tempat_lahir", "jenis_kelamin", "pekerjaan"],
    "kemiskinan": ["nik", "nama", "alamat", "status_dtks", "status_pkh", "status_bpnt", "penghasilan_bulanan", "jumlah_tanggungan", "tahun", "sumber"],
    "pendidikan": ["nik", "nama", "jenjang", "sekolah", "kota", "tahun_lulus"]
}

def is_valid_number(value: str) -> bool:
    try:
        val = value.strip().replace(" ", "")
        # Hilangkan titik ribuan, ganti koma desimal jadi titik
        normalized = val.replace(".", "").replace(",", ".")
        float(normalized)
        return True
    except (ValueError, AttributeError):
        return False

def validasi_data(jenis: str, data: Dict):
    required = JENIS_DATA_VALID[jenis]
    missing = [f for f in required if f not in data or not str(data[f]).strip()]
    if missing:
        raise HTTPException(status_code=422, detail=f"Field wajib belum lengkap: {', '.join(missing)}")

    nik = str(data.get("nik", "")).strip()
    if not nik.isdigit() or len(nik) != 16:
        raise HTTPException(status_code=422, detail="Field 'nik' harus 16 digit angka")

    if jenis == "penduduk":
        if not re.match(r"\d{4}-\d{2}-\d{2}$", data.get("tanggal_lahir", "")):
            raise HTTPException(status_code=422, detail="Format 'tanggal_lahir' harus YYYY-MM-DD")

    if jenis == "pendidikan":
        if not str(data.get("tahun_lulus", "")).isdigit():
            raise HTTPException(status_code=422, detail="'tahun_lulus' harus angka")

    if jenis == "kemiskinan":
        if not str(data.get("jumlah_tanggungan", "")).isdigit():
            raise HTTPException(status_code=422, detail="'jumlah_tanggungan' harus angka")
        if not is_valid_number(str(data.get("penghasilan_bulanan", ""))):
            raise HTTPException(status_code=422, detail="'penghasilan_bulanan' harus angka valid")

# fungsi untuk koreksi jenis data
def koreksi_jenis(jenis: str):
    cocok = get_close_matches(jenis, JENIS_DATA_VALID.keys(), n=1, cutoff=0.8)
    if cocok:
        return cocok[0]
    else:
        return jenis.lower()

def get_db_connection():
    return psycopg2.connect(
        dbname=settings.POSTGRES_DB,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
    )

# -------------------------------------
# Model Pydantic untuk data umum     
# -------------------------------------
class DataUmum(BaseModel):
    jenis_data: str
    data: Dict

# -------------------------------------
# 🔐 Auto-Creator Default Admin
# -------------------------------------
def create_default_admin():
    db: Session = SessionLocal()
    try:
        Base.metadata.create_all(bind=engine)
        default_username = "admin"
        default_password = "admin123"

        existing_admin = db.query(User).filter(User.username == default_username).first()
        if not existing_admin:
            admin_user = User(
                username=default_username,
                hashed_password=hash_password(default_password),
                role="admin",
                is_approved=True  # ✅ admin langsung disetujui
            )
            db.add(admin_user)
            db.commit()
            print("✅ Default admin created: username=admin, password=admin123")
        else:
            print("ℹ️ Admin already exists.")
    finally:
        db.close()

# -------------------------------------
# 🔐 Auto Create Table Data_Sumber
# -------------------------------------
def create_data_sumber_table():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS data_sumber (
                id SERIAL PRIMARY KEY,
                jenis_data TEXT NOT NULL,
                data JSONB NOT NULL,
                owner TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR DEFAULT 'pending',
                synced_at TIMESTAMP NULL
            );
        """)
        conn.commit()
        print("✅ Tabel data_sumber berhasil dibuat (dengan kolom status dan synced_at).")
    except Exception as e:
        conn.rollback()
        print(f"❌ Gagal membuat tabel data_sumber: {e}")
    finally:
        cur.close()
        conn.close()

# ============================
# 🔧 Tambah kolom is_approved (jika belum ada)
# ============================
def add_is_approved_column_if_missing():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='users' AND column_name='is_approved';
        """)
        if cur.fetchone() is None:
            cur.execute("ALTER TABLE users ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;")
            conn.commit()
            print("✅ Kolom is_approved berhasil ditambahkan.")
        else:
            print("ℹ️ Kolom is_approved sudah ada.")
    except Exception as e:
        print("❌ Gagal menambahkan kolom:", e)
    finally:
        cur.close()
        conn.close()


@app.on_event("startup")
def startup_event():
    add_is_approved_column_if_missing()
    create_default_admin()
    create_data_sumber_table()
    init_db()
    
# -------------------------------------
# 📌 Endpoint FastAPI
# -------------------------------------
# Endpoint untuk menyimpan data umum
@app.post("/api/data")
def simpan_data_umum(payload: DataUmum, user: User = Depends(get_current_user)):
    jenis_asli = koreksi_jenis(payload.jenis_data)
    if not jenis_asli:
        raise HTTPException(400, detail=f"Jenis data tidak dikenali: {payload.jenis_data}")

    validasi_data(jenis_asli, payload.data)
    nik = payload.data["nik"]

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS data_sumber (
                id SERIAL PRIMARY KEY,
                jenis_data TEXT NOT NULL,
                data JSONB NOT NULL,
                owner TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR DEFAULT 'pending',
                synced_at TIMESTAMP NULL
            );
        """)

        cur.execute("""
            SELECT data FROM data_sumber
            WHERE jenis_data = %s AND data->>'nik' = %s AND owner = %s
            ORDER BY created_at DESC LIMIT 1;
        """, (jenis_asli, nik, user.username))
        row = cur.fetchone()
        if row and row[0] == payload.data:
            raise HTTPException(400, detail=f"NIK '{nik}' sudah ada dan datanya tidak berubah.")

        cur.execute("""
            INSERT INTO data_sumber (jenis_data, data, owner, status, synced_at)
            VALUES (%s, %s, %s, %s, %s);
        """, (jenis_asli, json.dumps(payload.data), user.username, 'pending', None))
        conn.commit()

        return {"message": f"✅ Data untuk NIK '{nik}' berhasil disimpan.", "data": payload.data}
    except Exception as e:
        conn.rollback()
        raise HTTPException(500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# Endpoint untuk mendapatkan data berdasarkan jenis dengan pagination
@app.get("/api/data/{jenis_data}")
def get_data_by_jenis(
    jenis_data: str,
    limit: int = Query(10, ge=1),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user)
):
    # Gunakan fungsi koreksi_jenis yang sudah dimodifikasi
    jenis = koreksi_jenis(jenis_data)
    
    # Lanjutkan dengan query seperti biasa
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Hitung total baris
        if user.role == "admin":
            cur.execute("SELECT COUNT(*) FROM data_sumber WHERE jenis_data = %s", (jenis,))
        else:
            cur.execute("SELECT COUNT(*) FROM data_sumber WHERE jenis_data = %s AND owner = %s", (jenis, user.username))
        total_rows = cur.fetchone()[0]

        # Ambil data paginasi
        if user.role == "admin":
            cur.execute("""
                SELECT id, jenis_data, data, owner, created_at, status, synced_at FROM data_sumber
                WHERE jenis_data = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """, (jenis, limit, offset))
        else:
            cur.execute("""
                SELECT id, jenis_data, data, owner, created_at, status, synced_at FROM data_sumber
                WHERE jenis_data = %s AND owner = %s
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
            """, (jenis, user.username, limit, offset))

        rows = cur.fetchall()
        column_names = [desc[0] for desc in cur.description]
        data_list = [dict(zip(column_names, row)) for row in rows]

        return {
            "total": total_rows,
            "page": (offset // limit) + 1,
            "per_page": limit,
            "total_pages": ceil(total_rows / limit),
            "data": data_list
        }

    except Exception as e:
        raise HTTPException(500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# Endpoint untuk mendapatkan semua data dengan pagination
@app.get("/api/data")
def list_all_data(
    jenis_data: str = Query(None),
    search: str = Query(None),
    limit: int = Query(50),
    offset: int = Query(0),
    user: User = Depends(get_current_user)
):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        where_clause = []
        params = []

        if user.role != "admin":
            where_clause.append("owner = %s")
            params.append(user.username)

        if jenis_data and jenis_data != 'all':
            jenis = koreksi_jenis(jenis_data)
            if not jenis:
                # Kembalikan response kosong untuk jenis tidak dikenal
                return {
                    "total": 0,
                    "page": 1,
                    "per_page": limit,
                    "total_pages": 0,
                    "data": []
                }
            where_clause.append("jenis_data = %s")
            params.append(jenis)

        # Untuk jenis_data = 'all', tidak tambahkan filter jenis_data
        # sehingga mengembalikan semua data

        if search:
            where_clause.append("data::text ILIKE %s")
            params.append(f"%{search}%")

        where_sql = " WHERE " + " AND ".join(where_clause) if where_clause else ""

        # Hitung total data
        cur.execute(f"SELECT COUNT(*) FROM data_sumber{where_sql}", tuple(params))
        total = cur.fetchone()[0]
        total_pages = ceil(total / limit) if limit else 1

        # Ambil data
        query_data = f"""
            SELECT id, jenis_data, data, owner, created_at, status, synced_at FROM data_sumber
            {where_sql}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        cur.execute(query_data, tuple(params + [limit, offset]))
        rows = cur.fetchall()
        data = [dict(zip([desc[0] for desc in cur.description], row)) for row in rows]

        return {
            "total": total,
            "page": (offset // limit) + 1,
            "per_page": limit,
            "total_pages": total_pages,
            "data": data
        }

    except Exception as e:
        raise HTTPException(500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# Endpoint untuk mengupload CSV   
@app.post("/api/upload_csv")
async def upload_csv(jenis_data: str = Query(...), file: UploadFile = File(...), user: User = Depends(get_current_user)):
    jenis_asli = koreksi_jenis(jenis_data)
    if not jenis_asli:
        raise HTTPException(400, detail=f"Jenis data tidak dikenali: {jenis_data}")

    expected_fields = JENIS_DATA_VALID.get(jenis_asli)
    contents = await file.read()
    csv_text = contents.decode("utf-8")
    reader = csv.DictReader(StringIO(csv_text))

    missing_headers = [f for f in expected_fields if f not in reader.fieldnames]
    if missing_headers:
        return {
            "success": False,
            "message": "Kolom CSV tidak lengkap.",
            "kolom_invalid": ", ".join(missing_headers),
            "jumlah_data": 0,
            "errors": []
        }

    rows = list(reader)
    if not rows:
        raise HTTPException(400, detail="File CSV kosong")

    conn = get_db_connection()
    cur = conn.cursor()
    inserted = 0
    errors = []

    try:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS data_sumber (
                id SERIAL PRIMARY KEY,
                jenis_data TEXT NOT NULL,
                data JSONB NOT NULL,
                owner TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR DEFAULT 'pending',
                synced_at TIMESTAMP NULL
            );
        """)

        for idx, row in enumerate(rows, start=2):
            nik = row.get("nik", "").strip()
            if not nik:
                errors.append({"baris": idx, "alasan": "Field 'nik' kosong"})
                continue

            try:
                validasi_data(jenis_asli, row)
            except HTTPException as ve:
                errors.append({"baris": idx, "alasan": ve.detail})
                continue

            cur.execute("""
                SELECT data FROM data_sumber
                WHERE jenis_data = %s AND data->>'nik' = %s AND owner = %s
                ORDER BY created_at DESC LIMIT 1;
            """, (jenis_asli, nik, user.username))
            existing = cur.fetchone()
            if existing and existing[0] == row:
                errors.append({"baris": idx, "alasan": f"NIK {nik} sudah ada dan datanya tidak berubah"})
                continue

            cur.execute("""
                INSERT INTO data_sumber (jenis_data, data, owner, status, synced_at)
                VALUES (%s, %s, %s, %s, %s);
            """, (jenis_asli, json.dumps(row), user.username, 'pending', None))
            inserted += 1

        conn.commit()
        return {
            "success": inserted > 0,
            "message": f"✅ Berhasil mengupload {inserted} data ke jenis '{jenis_asli}'.",
            "jumlah_data": inserted,
            "errors": errors
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# download template CSV belum pakai Depends(get_current_user) karena belum ada autentikasi
@app.get("/template/{jenis}")
async def download_template_csv(jenis: str,
    user: User = Depends(get_current_user)
    ):
    allowed = ["penduduk", "kemiskinan", "pendidikan"]
    if jenis not in allowed:
        raise HTTPException(status_code=404, detail="Template tidak ditemukan")
    file_path = f"app/templates/{jenis}.csv"
    return FileResponse(file_path, media_type="text/csv", filename=f"{jenis}_template.csv")

# admin endpoint untuk menghapus data berdasarkan ID
@app.delete("/api/data/{data_id}")
def delete_data_by_id(
    data_id: int = Path(..., ge=1),
    user: User = Depends(get_current_user)
):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menghapus data.")

    conn = get_db_connection()
    cur = conn.cursor()
    try:
        
        cur.execute("SELECT jenis_data, data FROM data_sumber WHERE id = %s", (data_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Data tidak ditemukan.")

        jenis_data, data_json = row
        nik = data_json.get("nik")

        
        if jenis_data in ["penduduk", "kemiskinan", "pendidikan"]:
            
            cur.execute(f"DELETE FROM {jenis_data} WHERE nik = %s", (nik,))
        else:
            
            try:
                cur.execute(f"DELETE FROM {jenis_data} WHERE nik = %s", (nik,))
            except Exception as e:
                print(f"⚠ Tabel dinamis {jenis_data} mungkin tidak ada: {e}")


        cur.execute("DELETE FROM data_sumber WHERE id = %s", (data_id,))
        conn.commit()

        return {"message": f"✅ Data dengan ID {data_id} berhasil dihapus dari semua tabel."}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal menghapus data: {str(e)}")
    finally:
        cur.close()
        conn.close()


