# type: ignore
from airflow import DAG
from airflow.operators.python import PythonOperator
import pendulum
from datetime import datetime
import psycopg2
import logging
import json
from app.config import settings


JENIS_DATA_VALID = {
    "penduduk": [
        "nik", "nama", "alamat", "kota", "tanggal_lahir", "tempat_lahir", "jenis_kelamin", "pekerjaan"
    ],
    "kemiskinan": [
        "nik", "nama", "alamat", "status_dtks", "status_pkh", "status_bpnt",
        "penghasilan_bulanan", "jumlah_tanggungan", "tahun", "sumber"
    ],
    "pendidikan": [
        "nik", "nama", "jenjang", "sekolah", "kota", "tahun_lulus"
    ]
}

def get_db_connection():
    return psycopg2.connect(
        dbname=settings.POSTGRES_DB,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
    )

def get_schema_from_data_schema(jenis_data):
    if jenis_data in JENIS_DATA_VALID:
        return JENIS_DATA_VALID[jenis_data]
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT schema FROM data_schemas WHERE table_name = %s", (jenis_data,))
        result = cur.fetchone()
        return json.loads(result[0]) if result else None
    except Exception as e:
        logging.error(f"❌ Error mengambil schema untuk {jenis_data}: {e}")
        return None
    finally:
        cur.close()
        conn.close()

def compare_schemas(current_schema, new_data):
    """Bandingkan schema saat ini dengan data baru, return True jika sama persis"""
    if not current_schema:
        return False
    
    # Bersihkan semua nama kolom dari spasi dan ubah ke lowercase
    current_schema_clean = {col.strip().lower() for col in current_schema}
    new_keys_clean = {key.strip().lower() for key in new_data.keys()}
    
    return current_schema_clean == new_keys_clean

def create_dynamic_table(jenis_data, schema):
    """Buat tabel dinamis berdasarkan schema"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Cek apakah tabel sudah ada
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = %s
            );
        """, (jenis_data,))
        table_exists = cur.fetchone()[0]
        
        if table_exists:
            logging.info(f"✅ Tabel {jenis_data} sudah ada")
            return True
            
        columns = ["nik VARCHAR(16) PRIMARY KEY"]
        
        # Hindari duplikasi kolom
        unique_columns = set()
        for col in schema:
            col_clean = col.strip()
            if col_clean != "nik" and col_clean not in ["id", "created_at", "updated_at"]:
                if col_clean not in unique_columns:
                    unique_columns.add(col_clean)
                    columns.append(f"{col_clean} TEXT")
        
        columns.append("updated_at TIMESTAMP DEFAULT NOW()")
        
        create_table_sql = f"""
            CREATE TABLE {jenis_data} (
                {', '.join(columns)}
            );
        """
        
        logging.info(f"🛠 Membuat tabel {jenis_data}")
        cur.execute(create_table_sql)
        conn.commit()
        logging.info(f"✅ Tabel {jenis_data} berhasil dibuat")
        return True
        
    except Exception as e:
        logging.error(f"❌ Gagal membuat tabel {jenis_data}: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()

def table_exists(jenis_data):
    """Cek apakah tabel sudah ada"""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = %s
            );
        """, (jenis_data,))
        return cur.fetchone()[0]
    finally:
        cur.close()
        conn.close()

def validasi_data_ketat(jenis, data):
    if jenis not in JENIS_DATA_VALID:
        return None
    
    required = JENIS_DATA_VALID[jenis]
    missing = [f for f in required if f not in data or not str(data[f]).strip()]
    if missing:
        return f"Field wajib belum lengkap: {', '.join(missing)}"

    nik = str(data.get("nik", "")).strip()
    if not nik.isdigit() or len(nik) != 16:
        return "Field 'nik' harus 16 digit angka"

    if jenis == "penduduk":
        try:
            if data.get("tanggal_lahir"):
                datetime.strptime(data.get("tanggal_lahir", ""), "%Y-%m-%d")
        except Exception:
            return "Format 'tanggal_lahir' harus YYYY-MM-DD"

    if jenis == "pendidikan":
        if data.get("tahun_lulus") and not str(data.get("tahun_lulus", "")).isdigit():
            return "'tahun_lulus' harus angka"

    if jenis == "kemiskinan":
        if data.get("jumlah_tanggungan") and not str(data.get("jumlah_tanggungan", "")).isdigit():
            return "'jumlah_tanggungan' harus angka"
        if data.get("penghasilan_bulanan") and not str(data.get("penghasilan_bulanan", "")).replace(".", "").replace(",", "").isdigit():
            return "'penghasilan_bulanan' harus angka"
        
        for status_field in ['status_dtks', 'status_pkh', 'status_bpnt']:
            if status_field in data:
                if isinstance(data[status_field], str):
                    data[status_field] = data[status_field].lower() == 'menerima'
                elif not isinstance(data[status_field], bool):
                    data[status_field] = False
    return None

def validasi_data_dinamis(jenis, data):
    nik = str(data.get("nik", "")).strip()
    if not nik or not nik.isdigit() or len(nik) != 16:
        return "NIK harus 16 digit angka"
    return None

def sinkronisasi_data():
    logging.info("🔄 Memulai sinkronisasi data...")
    
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Buat log_sinkronisasi jika belum ada
        cur.execute("""
            CREATE TABLE IF NOT EXISTS log_sinkronisasi (
                jenis_data TEXT PRIMARY KEY,
                last_sync_time TIMESTAMP
            );
        """)
        conn.commit()

        # ✅ PERBAIKAN: Ambil daftar jenis data unik dari data_sumber yang MASIH pending
        cur.execute("SELECT DISTINCT jenis_data FROM data_sumber WHERE status = 'pending';")
        jenis_list = [row[0] for row in cur.fetchall()]
        
        logging.info(f"📋 Jenis data pending: {jenis_list}")

        if not jenis_list:
            logging.info("✅ Tidak ada data pending untuk diproses")
            return

        total_processed = 0
        total_success = 0
        total_failed = 0

        for jenis in jenis_list:
            logging.info(f"🔄 Memproses jenis data: {jenis}")

            try:
                # ✅ PERBAIKAN: Commit transaction sebelum memulai jenis data baru
                conn.commit()
                
                # Ambil schema dari data_schemas
                schema = get_schema_from_data_schema(jenis)
                
                # Ambil sample data pertama untuk cek konsistensi
                cur.execute("""
                    SELECT data FROM data_sumber
                    WHERE jenis_data = %s AND status = 'pending'
                    ORDER BY created_at ASC LIMIT 1;
                """, (jenis,))
                sample_row = cur.fetchone()
                
                if not sample_row:
                    logging.info(f"✅ Tidak ada data pending untuk jenis {jenis}")
                    continue
                
                sample_data_json = sample_row[0]
                sample_data = json.loads(sample_data_json) if isinstance(sample_data_json, str) else sample_data_json
                
                # Validasi schema untuk SEMUA jenis data
                if schema:
                    is_schema_consistent = compare_schemas(schema, sample_data)
                    
                    if not is_schema_consistent:
                        logging.error(f"❌ SCHEMA TIDAK KONSISTEN: Data {jenis} memiliki kolom berbeda")
                        logging.error(f"   Schema existing: {schema}")
                        logging.error(f"   Schema baru: {list(sample_data.keys())}")
                        
                        error_msg = f"Schema tidak konsisten. Jenis data '{jenis}' sudah ada dengan schema berbeda. Silakan ubah nama file/jenis data (misal: {jenis}_baru, {jenis}1, dll)"
                        
                        cur.execute("""
                            UPDATE data_sumber
                            SET status = 'failed', error_message = %s, synced_at = NOW()
                            WHERE jenis_data = %s AND status = 'pending';
                        """, (error_msg, jenis))
                        
                        conn.commit()  # ✅ COMMIT setelah update status
                        logging.error(f"❌ Semua data {jenis} ditolak: {error_msg}")
                        continue

                # Jika belum ada schema, simpan schema baru
                if not schema:
                    new_schema = list(sample_data.keys())
                    logging.info(f"💾 Menyimpan schema baru untuk {jenis}: {new_schema}")
                    
                    cur.execute("""
                        INSERT INTO data_schemas (table_name, schema)
                        VALUES (%s, %s)
                        ON CONFLICT (table_name) DO UPDATE SET schema = EXCLUDED.schema
                    """, (jenis, json.dumps(new_schema)))
                    
                    schema = new_schema
                    conn.commit()  # ✅ COMMIT setelah simpan schema

                logging.info(f"📋 Schema untuk {jenis}: {schema}")

                # Pastikan tabel sudah ada
                if not table_exists(jenis):
                    logging.info(f"🛠 Tabel {jenis} belum ada, mencoba membuat...")
                    if not create_dynamic_table(jenis, schema):
                        logging.error(f"❌ Gagal membuat tabel untuk {jenis}, melewati...")
                        continue
                else:
                    logging.info(f"✅ Tabel {jenis} sudah ada")

                # ✅ PERBAIKAN: Ambil data pending LAGI untuk memastikan data terbaru
                cur.execute("""
                    SELECT id, data FROM data_sumber
                    WHERE jenis_data = %s AND status = 'pending'
                    ORDER BY created_at ASC;
                """, (jenis,))
                rows = cur.fetchall()

                if not rows:
                    logging.info(f"✅ Tidak ada data pending untuk jenis {jenis}")
                    continue

                now = datetime.now()
                sukses_ids = []
                gagal_ids = []

                for data_id, data_json in rows:
                    try:
                        # Parse JSON data
                        if isinstance(data_json, str):
                            data = json.loads(data_json)
                        else:
                            data = data_json

                        # Validasi konsistensi schema untuk setiap data
                        current_schema_set = {col.strip().lower() for col in schema}
                        data_keys_set = {key.strip().lower() for key in data.keys()}
                        
                        if current_schema_set != data_keys_set:
                            error_msg = f"Schema tidak konsisten. Diharapkan: {schema}, Didapat: {list(data.keys())}"
                            logging.warning(f"⛔ Data ID {data_id} gagal validasi schema: {error_msg}")
                            gagal_ids.append(data_id)
                            continue

                        # Validasi data
                        if jenis in JENIS_DATA_VALID:
                            error_msg = validasi_data_ketat(jenis, data)
                        else:
                            error_msg = validasi_data_dinamis(jenis, data)
                            
                        if error_msg:
                            logging.warning(f"⛔ Data ID {data_id} gagal validasi: {error_msg}")
                            gagal_ids.append(data_id)
                            continue

                        # Siapkan kolom dan values untuk insert
                        kolom = ["nik"]
                        values = [data.get("nik", "")]
                        
                        for col in schema:
                            if col != "nik":
                                if col in data:
                                    kolom.append(col)
                                    values.append(str(data[col]))
                                else:
                                    kolom.append(col)
                                    values.append("")

                        kolom_str = ", ".join(kolom)
                        placeholders = ", ".join(["%s"] * len(kolom))
                        update_set = ", ".join([f"{col} = EXCLUDED.{col}" for col in kolom if col != "nik"])

                        # Insert/update data
                        insert_sql = f"""
                            INSERT INTO {jenis} ({kolom_str})
                            VALUES ({placeholders})
                            ON CONFLICT (nik) DO UPDATE
                            SET {update_set}, updated_at = NOW();
                        """
                        
                        cur.execute(insert_sql, values)
                        sukses_ids.append(data_id)
                        logging.info(f"✅ Data ID {data_id} berhasil disinkronisasi")

                    except Exception as e:
                        logging.error(f"❌ Error processing data ID {data_id}: {e}")
                        gagal_ids.append(data_id)

                # Update status data_sumber
                if sukses_ids:
                    cur.execute("""
                        UPDATE data_sumber
                        SET status = 'success', synced_at = %s
                        WHERE id = ANY(%s);
                    """, (now, sukses_ids))
                    conn.commit()  # ✅ COMMIT setelah update success

                if gagal_ids:
                    cur.execute("""
                        UPDATE data_sumber
                        SET status = 'failed', synced_at = %s
                        WHERE id = ANY(%s);
                    """, (now, gagal_ids))
                    conn.commit()  # ✅ COMMIT setelah update failed

                # Log sinkronisasi
                cur.execute("""
                    INSERT INTO log_sinkronisasi (jenis_data, last_sync_time)
                    VALUES (%s, %s)
                    ON CONFLICT (jenis_data)
                    DO UPDATE SET last_sync_time = EXCLUDED.last_sync_time;
                """, (jenis, now))
                conn.commit()  # ✅ COMMIT log sinkronisasi

                total_processed += len(rows)
                total_success += len(sukses_ids)
                total_failed += len(gagal_ids)
                
                logging.info(f"📊 {jenis}: {len(sukses_ids)} berhasil, {len(gagal_ids)} gagal")

            except Exception as e:
                logging.error(f"❌ Error memproses jenis data {jenis}: {e}")
                import traceback
                logging.error(traceback.format_exc())
                conn.rollback()  # ✅ Rollback jika error di jenis data tertentu
                continue

        logging.info(f"🎯 Sinkronisasi selesai. Total: {total_processed}, Berhasil: {total_success}, Gagal: {total_failed}")

    except Exception as e:
        logging.error(f"❌ Error utama dalam sinkronisasi: {e}")
        import traceback
        logging.error(traceback.format_exc())
        conn.rollback()
    finally:
        cur.close()
        conn.close()
        logging.info("🔚 Sinkronisasi selesai")

# === DAG Configuration ===
default_args = {
    "start_date": pendulum.datetime(2025, 6, 25, tz="Asia/Jakarta"),
}

with DAG(
    dag_id="sinkronisasi_data_dag",
    default_args=default_args,
    schedule_interval="0 10 * * *",
    catchup=False,
    tags=["sinkronisasi", "dinamis"],
) as dag:
    sinkronisasi = PythonOperator(
        task_id="sinkronisasi_data",
        python_callable=sinkronisasi_data
    )

globals()["sinkronisasi_data_dag"] = dag