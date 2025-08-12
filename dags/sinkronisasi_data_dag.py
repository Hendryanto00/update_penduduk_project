# type: ignore
from airflow import DAG
from airflow.operators.python import PythonOperator
import pendulum
from datetime import datetime
import psycopg2
import logging
from app.config import settings

# ✅ Daftar field wajib untuk validasi tiap jenis data
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

def validasi_data(jenis, data):
    required = JENIS_DATA_VALID[jenis]
    missing = [f for f in required if f not in data or not str(data[f]).strip()]
    if missing:
        return f"Field wajib belum lengkap: {', '.join(missing)}"

    nik = str(data.get("nik", "")).strip()
    if not nik.isdigit() or len(nik) != 16:
        return "Field 'nik' harus 16 digit angka"

    if jenis == "penduduk":
        try:
            datetime.strptime(data.get("tanggal_lahir", ""), "%Y-%m-%d")
        except Exception:
            return "Format 'tanggal_lahir' harus YYYY-MM-DD"

    if jenis == "pendidikan":
        if not str(data.get("tahun_lulus", "")).isdigit():
            return "'tahun_lulus' harus angka"

    if jenis == "kemiskinan":
        if not str(data.get("jumlah_tanggungan", "")).isdigit():
            return "'jumlah_tanggungan' harus angka"
        if not str(data.get("penghasilan_bulanan", "")).replace(".", "").replace(",", "").isdigit():
            return "'penghasilan_bulanan' harus angka"

    return None

def sinkronisasi_data():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS log_sinkronisasi (
            jenis_data TEXT PRIMARY KEY,
            last_sync_time TIMESTAMP
        );
    """)

    cur.execute("SELECT DISTINCT jenis_data FROM data_sumber;")
    jenis_list = [row[0] for row in cur.fetchall()]

    for jenis in jenis_list:
        if jenis not in JENIS_DATA_VALID:
            logging.warning(f"⚠ Jenis data tidak valid: {jenis}, dilewati")
            cur.execute("DELETE FROM data_sumber WHERE jenis_data = %s;", (jenis,))
            conn.commit()
            continue

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

        for data_id, data in rows:
            alasan = validasi_data(jenis, data)
            if alasan:
                logging.warning(f"⛔ Data ID {data_id} gagal validasi: {alasan}")
                gagal_ids.append(data_id)
                continue

            for k, v in data.items():
                if isinstance(v, str):
                    str_val = v.strip().lower()
                    if str_val in ["true", "menerima"]:
                        data[k] = True
                    elif str_val in ["false", "tidak menerima"]:
                        data[k] = False

            kolom = list(data.keys())
            kolom_str = ", ".join(kolom)
            placeholders = ", ".join(["%s"] * len(kolom))
            update_clause = ", ".join([f"{k} = EXCLUDED.{k}" for k in kolom if k != "nik"])
            values = [data[k] for k in kolom]

            cur.execute(f"""
                INSERT INTO {jenis} ({kolom_str})
                VALUES ({placeholders})
                ON CONFLICT (nik) DO UPDATE
                SET {update_clause}, updated_at = NOW();
            """, values)

            sukses_ids.append(data_id)

        if sukses_ids:
            cur.execute("""
                UPDATE data_sumber
                SET status = 'success', synced_at = %s
                WHERE id = ANY(%s);
            """, (now, sukses_ids))

        if gagal_ids:
            cur.execute("""
                UPDATE data_sumber
                SET status = 'failed', synced_at = %s
                WHERE id = ANY(%s);
            """, (now, gagal_ids))

        cur.execute("""
            INSERT INTO log_sinkronisasi (jenis_data, last_sync_time)
            VALUES (%s, %s)
            ON CONFLICT (jenis_data)
            DO UPDATE SET last_sync_time = EXCLUDED.last_sync_time;
        """, (jenis, now))

        logging.info(f"📥 {len(sukses_ids)} berhasil, {len(gagal_ids)} gagal untuk jenis {jenis}")
        conn.commit()

    cur.close()
    conn.close()

# === DAG Configuration ===
default_args = {
    "start_date": pendulum.datetime(2025, 6, 25, tz="Asia/Jakarta"),
}

with DAG(
    dag_id="sinkronisasi_data_dag",
    default_args=default_args,
    # schedule_interval="0 7 * * *",  # 07:00 WIB setiap hari
    schedule_interval="0 10 * * *",  # 10:00 WIB setiap hari
    catchup=False,
    tags=["sinkronisasi", "dinamis"],
) as dag:
    sinkronisasi = PythonOperator(
        task_id="sinkronisasi_data",
        python_callable=sinkronisasi_data
    )

globals()["sinkronisasi_data_dag"] = dag
