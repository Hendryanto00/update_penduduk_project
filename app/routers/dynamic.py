from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from datetime import datetime
import time
import traceback
from app.database import engine
from sqlalchemy import inspect
import json

from app.auth.routes import get_current_user
from app.auth.models import User
from app.auth.dynamic_utils import parse_csv, sanitize_name, save_schema, get_schema, JENIS_DATA_VALID
from app.database import SessionLocal

router = APIRouter(
    prefix="/dynamic",
    tags=["Dynamic Data"]
)

# ================= Upload CSV Dynamic =================
@router.post("/upload")
async def upload_csv_dynamic(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user)
):
    try:
        content = await file.read()
        headers, rows = parse_csv(content)

        if not headers:
            raise HTTPException(status_code=400, detail="CSV kosong atau tidak ada header")

        if "nik" not in [h.lower() for h in headers]:
            raise HTTPException(status_code=400, detail="Kolom wajib hilang: nik")

        table_name = file.filename.split(".")[0]
        table_name_sanitized = sanitize_name(table_name)
        
        # Validasi schema berdasarkan kategori
        db = SessionLocal()
        try:
            # 1. Cek apakah ini data standar
            if table_name_sanitized in JENIS_DATA_VALID:
                standard_columns = JENIS_DATA_VALID[table_name_sanitized]
                uploaded_columns = [sanitize_name(h) for h in headers]
                
                # Validasi kolom harus sama persis dengan data standar
                if set(uploaded_columns) != set(standard_columns):
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Nama file '{table_name}' sama dengan data standar tetapi kolomnya berbeda. "
                            f"Silakan ubah nama file untuk membuat tabel dinamis baru. "
                            f"Kolom standar untuk '{table_name_sanitized}': {standard_columns}. "
                            f"Kolom yang diupload: {uploaded_columns}"
                        )
                    )
            
            # 2. Cek apakah ini data dinamis yang sudah ada di data_schemas
            else:
                existing_schema = get_schema(table_name_sanitized)
                
                if existing_schema:
                    # Validasi schema harus sama dengan yang tersimpan
                    uploaded_columns = [sanitize_name(h) for h in headers]
                    
                    if set(uploaded_columns) != set(existing_schema):
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"Jenis data '{table_name_sanitized}' sudah ada dengan schema berbeda. "
                                f"Schema existing: {sorted(existing_schema)}. "
                                f"Schema baru: {sorted(uploaded_columns)}. "
                                f"Solusi: Ubah nama file CSV Anda (misal: \"{table_name_sanitized}_baru.csv\")."
                            )
                        )
                else:
                    # Data dinamis baru - simpan schema
                    save_schema(table_name_sanitized, headers)
        
        finally:
            db.close()

        # Simpan data ke data_sumber
        db = SessionLocal()
        for row in rows:
            data_json = json.dumps(row)
            
            db.execute(
                text("""
                INSERT INTO data_sumber (jenis_data, data, owner, status, created_at)
                VALUES (:jenis_data, jsonb(:data), :owner, :status, :created_at)
                """),
                {
                    "jenis_data": table_name_sanitized,
                    "data": data_json,   
                    "owner": user.username,
                    "status": "pending",
                    "created_at": datetime.utcnow(),
                }
            )
        db.commit()
        db.close()

        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "success": True,
                "message": f"Data '{table_name_sanitized}' berhasil disimpan ke data_sumber dengan {len(rows)} baris. Menunggu proses sinkronisasi Airflow.",
                "headers": headers,
                "jenis_data": table_name_sanitized,
                "total_rows": len(rows)
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        print("🔥 ERROR upload CSV:", e)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error uploading CSV: {str(e)}")