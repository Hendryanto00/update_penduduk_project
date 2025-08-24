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
    if jenis_data == "penduduk":
        return JENIS_DATA_VALID["penduduk"]
    elif jenis_data == "kemiskinan":
        return JENIS_DATA_VALID["kemiskinan"]
    elif jenis_data == "pendidikan":
        return JENIS_DATA_VALID["pendidikan"]
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT schema FROM data_schemas WHERE table_name = %s", (jenis_data,))
        result = cur.fetchone()
        return result[0] if result else None
    except Exception as e:
        logging.error(f"❌ Error mengambil schema untuk {jenis_data}: {e}")
        return None
    finally:
        cur.close()
        conn.close()

def create_dynamic_table(jenis_data, schema):
    """Buat tabel dinamis berdasarkan schema"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
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
        
        for col in schema:
            if col != "nik" and col not in ["nik", "id", "created_at", "updated_at"]:
                columns.append(f"{col} TEXT")
        
        columns.append("updated_at TIMESTAMP DEFAULT NOW()")
        
        create_table_sql = f"""
            CREATE TABLE {jenis_data} (
                {', '.join(columns)}
            );
        """
        
        logging.info(f"🛠 Membuat tabel {jenis_data} dengan SQL: {create_table_sql}")
        cur.execute(create_table_sql)
        conn.commit()
        logging.info(f"✅ Tabel {jenis_data} berhasil dibuat dengan schema: {schema}")
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
                    # Konversi string "menerima" menjadi True, selainnya False
                    data[status_field] = data[status_field].lower() == 'menerima'
                elif isinstance(data[status_field], bool):
                    # Jika sudah boolean, biarkan apa adanya
                    pass
                else:
                    # Untuk tipe data lainnya, konversi ke False
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

        # Ambil daftar jenis data unik dari data_sumber
        cur.execute("SELECT DISTINCT jenis_data FROM data_sumber WHERE status = 'pending';")
        jenis_list = [row[0] for row in cur.fetchall()]
        
        logging.info(f"📋 Jenis data pending: {jenis_list}")

        if not jenis_list:
            logging.info("✅ Tidak ada data pending untuk diproses")
            return

        # Variabel untuk melacak progress
        total_processed = 0
        total_success = 0
        total_failed = 0

        for jenis in jenis_list:
            logging.info(f"🔄 Memproses jenis data: {jenis}")

            try:
                # Ambil schema dari data_schemas
                schema = get_schema_from_data_schema(jenis)
                if not schema:
                    logging.warning(f"⚠ Schema tidak ditemukan untuk {jenis}, melewati...")
                    continue

                logging.info(f"📋 Schema untuk {jenis}: {schema}")

                # Pastikan tabel sudah ada sebelum memproses data
                if not table_exists(jenis):
                    logging.info(f"🛠 Tabel {jenis} belum ada, mencoba membuat...")
                    if not create_dynamic_table(jenis, schema):
                        logging.error(f"❌ Gagal membuat tabel untuk {jenis}, melewati...")
                        continue
                else:
                    logging.info(f"✅ Tabel {jenis} sudah ada")

                # Ambil data pending untuk jenis ini
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

                        logging.info(f"📝 Processing data ID {data_id} untuk jenis {jenis}")

                        # VALIDASI BERDASARKAN JENIS DATA
                        if jenis in JENIS_DATA_VALID:
                            error_msg = validasi_data_ketat(jenis, data)
                            if error_msg:
                                logging.warning(f"⛔ Data ID {data_id} gagal validasi ketat: {error_msg}")
                                gagal_ids.append(data_id)
                                continue
                        else:
                            error_msg = validasi_data_dinamis(jenis, data)
                            if error_msg:
                                logging.warning(f"⛔ Data ID {data_id} gagal validasi dasar: {error_msg}")
                                gagal_ids.append(data_id)
                                continue

                        # Siapkan kolom dan values untuk insert
                        kolom = ["nik"]
                        values = [data.get("nik", "")]
                        
                        # Hanya ambil kolom yang ada di schema
                        for col in schema:
                            if col != "nik":
                                if col in data:
                                    kolom.append(col)
                                    values.append(str(data[col]))
                                else:
                                    # Jika kolom di schema tapi tidak ada di data, isi dengan empty string
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
                        
                        logging.info(f"💾 Executing SQL untuk {jenis}")
                        cur.execute(insert_sql, values)
                        sukses_ids.append(data_id)
                        logging.info(f"✅ Data ID {data_id} berhasil disinkronisasi ke tabel {jenis}")

                    except Exception as e:
                        logging.error(f"❌ Error processing data ID {data_id}: {e}")
                        gagal_ids.append(data_id)

                # Update status data_sumber untuk jenis ini
                if sukses_ids:
                    cur.execute("""
                        UPDATE data_sumber
                        SET status = 'success', synced_at = %s
                        WHERE id = ANY(%s);
                    """, (now, sukses_ids))
                    logging.info(f"✅ Updated {len(sukses_ids)} {jenis} records to success status")

                if gagal_ids:
                    cur.execute("""
                        UPDATE data_sumber
                        SET status = 'failed', synced_at = %s
                        WHERE id = ANY(%s);
                    """, (now, gagal_ids))
                    logging.info(f"⚠ Updated {len(gagal_ids)} {jenis} records to failed status")

                # Log sinkronisasi untuk jenis ini
                cur.execute("""
                    INSERT INTO log_sinkronisasi (jenis_data, last_sync_time)
                    VALUES (%s, %s)
                    ON CONFLICT (jenis_data)
                    DO UPDATE SET last_sync_time = EXCLUDED.last_sync_time;
                """, (jenis, now))

                total_processed += len(rows)
                total_success += len(sukses_ids)
                total_failed += len(gagal_ids)
                
                logging.info(f"📊 {jenis}: {len(sukses_ids)} berhasil, {len(gagal_ids)} gagal")

            except Exception as e:
                logging.error(f"❌ Error memproses jenis data {jenis}: {e}")
                import traceback
                logging.error(traceback.format_exc())
                continue

        conn.commit()
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
    schedule_interval="0 10 * * *", # Setiap hari jam 10 pagi
    catchup=False,
    tags=["sinkronisasi", "dinamis"],
) as dag:
    sinkronisasi = PythonOperator(
        task_id="sinkronisasi_data",
        python_callable=sinkronisasi_data
    )

globals()["sinkronisasi_data_dag"] = dag