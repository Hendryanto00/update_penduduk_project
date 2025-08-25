import csv
import io
import re
import json
from sqlalchemy import Table, Column, String, MetaData, text, inspect
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, DataSchema

metadata = MetaData()

# Data standar yang valid
JENIS_DATA_VALID = {
    "penduduk": ["nik", "nama", "alamat", "kota", "tanggal_lahir", "tempat_lahir", "jenis_kelamin", "pekerjaan"],
    "kemiskinan": ["nik", "nama", "alamat", "status_dtks", "status_pkh", "status_bpnt", "penghasilan_bulanan", "jumlah_tanggungan", "tahun", "sumber"],
    "pendidikan": ["nik", "nama", "jenjang", "sekolah", "kota", "tahun_lulus"]
}

def sanitize_name(name: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]", "_", name.strip().lower())

def parse_csv(file_content: bytes):
    # Coba mulai dengan beberapa encoding umum
    encodings = ['utf-8-sig', 'utf-8', 'latin-1']
    
    for encoding in encodings:
        try:
            text_data = file_content.decode(encoding)
            reader = csv.DictReader(io.StringIO(text_data))
            
            # ✅ BERSIHKAN SPASI DI HEADER
            headers = [h.strip() for h in reader.fieldnames] if reader.fieldnames else []
            
            rows = list(reader)
            return headers, rows
        except UnicodeDecodeError:
            continue
            
    raise ValueError("Tidak bisa decode file dengan encoding yang umum")

def is_standard_table(table_name: str) -> bool:
    """Cek apakah nama tabel termasuk tabel standar."""
    STANDARD_TABLES = list(JENIS_DATA_VALID.keys())
    return sanitize_name(table_name) in STANDARD_TABLES

def validate_table_name(table_name: str, headers: list[str]) -> str:
    """Validasi nama tabel untuk mencegah konflik dengan tabel standar DAN tabel dinamis yang sudah ada."""
    table_name_sanitized = sanitize_name(table_name)
    
    db = SessionLocal()
    try:
        existing_schema = db.execute(
            text("SELECT schema FROM data_schemas WHERE table_name = :table_name"),
            {"table_name": table_name_sanitized}
        ).fetchone()
        
        if existing_schema:
            # Jika tabel dinamis sudah ada, validasi schema harus sama persis
            existing_columns = set(json.loads(existing_schema[0]))
            uploaded_columns = set([sanitize_name(h) for h in headers])
            
            if existing_columns != uploaded_columns:
                raise ValueError(
                    f"Jenis data '{table_name_sanitized}' sudah ada dengan schema berbeda. "
                    f"Schema existing: {sorted(existing_columns)}. "
                    f"Schema baru: {sorted(uploaded_columns)}. "
                    f"Solusi: Ubah nama file CSV Anda (misal: \"{table_name_sanitized}_baru.csv\")."
                )
    
    finally:
        db.close()
    
    # Validasi untuk tabel standar
    if is_standard_table(table_name):
        standard_columns = JENIS_DATA_VALID.get(table_name_sanitized, [])
        uploaded_columns = [sanitize_name(h) for h in headers]
        
        if set(uploaded_columns) != set(standard_columns):
            raise ValueError(
                f"Nama file '{table_name}' sama dengan data standar tetapi kolomnya berbeda. "
                f"Kolom standar untuk '{table_name_sanitized}': {standard_columns}. "
                f"Kolom yang diupload: {uploaded_columns}. "
                f"Solusi: Ubah nama file CSV Anda (misal: \"{table_name_sanitized}_baru.csv\") "
                f"atau sesuaikan kolomnya dengan standar."
            )
    
    return table_name_sanitized

def create_dynamic_table(table_name: str, columns: list[str]):
    table_name = sanitize_name(table_name)

    # Pastikan ada kolom 'nik'
    if "nik" not in [sanitize_name(c) for c in columns]:
        columns = ["nik"] + [c for c in columns if sanitize_name(c) != "nik"]

    inspector = inspect(engine)
    
    # Jika tabel sudah ada, tambahkan kolom baru jika diperlukan
    if inspector.has_table(table_name):
        existing_columns = [col['name'] for col in inspector.get_columns(table_name)]
        new_columns = [c for c in columns if sanitize_name(c) not in existing_columns]
        
        if new_columns:
            with engine.begin() as conn:
                for col in new_columns:
                    conn.execute(
                        text(f'ALTER TABLE "{table_name}" ADD COLUMN "{sanitize_name(col)}" TEXT')
                    )
    else:
        # Buat tabel baru jika belum ada
        cols = [Column(sanitize_name(c), String) for c in columns]
        table = Table(table_name, metadata, *cols)
        metadata.create_all(engine, tables=[table])
    
    return table_name

def save_schema(table_name: str, schema: list[str]):
    db: Session = SessionLocal()
    try:
        table_name_sanitized = sanitize_name(table_name)
        
        # Cek apakah schema sudah ada
        existing_schema = db.query(DataSchema).filter(
            DataSchema.table_name == table_name_sanitized
        ).first()
        
        if existing_schema:
            # Update schema yang sudah ada
            existing_schema.schema = [sanitize_name(c) for c in schema]
        else:
            # Buat schema baru
            obj = DataSchema(
                table_name=table_name_sanitized,
                schema=[sanitize_name(c) for c in schema]
            )
            db.add(obj)
        
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

def get_schema(table_name: str):
    db: Session = SessionLocal()
    try:
        obj = db.query(DataSchema).filter(
            DataSchema.table_name == sanitize_name(table_name)
        ).first()
        return obj.schema if obj else None
    finally:
        db.close()

# Pastikan NIK selalu ada dalam data yang diupload
def insert_rows(table_name: str, rows: list[dict]):
    table_name = sanitize_name(table_name)
    schema = get_schema(table_name) or []

    if not schema:
        raise ValueError(f"Tabel '{table_name}' belum memiliki schema")

    with engine.begin() as conn:
        for row in rows:
            values = {
                sanitize_name(k): (v.strip() if isinstance(v, str) else v)
                for k, v in row.items()
                if sanitize_name(k) in schema
            }
            
            if not values:
                continue
                
            # Cek apakah data dengan NIK yang sama sudah ada
            nik_value = values.get('nik')
            if nik_value:
                # Buat query untuk update jika data sudah ada
                set_clause = ", ".join([f"{k} = :{k}" for k in values.keys() if k != 'nik'])
                update_query = text(
                    f'UPDATE "{table_name}" SET {set_clause} WHERE nik = :nik_value'
                )
                result = conn.execute(update_query, {**values, 'nik_value': nik_value})
                
                # Jika tidak ada row yang diupdate, lakukan insert
                if result.rowcount == 0:
                    cols = ",".join(values.keys())
                    placeholders = ",".join([f":{k}" for k in values.keys()])
                    conn.execute(
                        text(f'INSERT INTO "{table_name}" ({cols}) VALUES ({placeholders})'),
                        values
                    )
