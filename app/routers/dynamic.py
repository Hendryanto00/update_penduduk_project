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
from app.auth.dynamic_utils import parse_csv, sanitize_name, save_schema
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
        
        save_schema(table_name_sanitized, headers)

        
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

    except Exception as e:
        print("🔥 ERROR upload CSV:", e)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error uploading CSV: {str(e)}")



