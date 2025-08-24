function DataFormatNote({ jenis }) {
    const formatInfo = {
    penduduk: [
        { field: "nik", note: "16 digit angka (mis: 3201010101010001)" },
        { field: "nama", note: "Teks (mis: Budi Santoso)" },
        { field: "alamat", note: "Teks alamat lengkap" },
        { field: "kota", note: "Teks nama kota (mis: Bandung)" },
        { field: "tanggal_lahir", note: "Format tanggal YYYY-MM-DD (mis: 1990-01-01)" },
        { field: "tempat_lahir", note: "Teks (mis: Jakarta)" },
        { field: "jenis_kelamin", note: "Teks (mis: Laki-laki / Perempuan)" },
        { field: "pekerjaan", note: "Teks (mis: Petani, Pegawai Negeri)" },
    ],
    kemiskinan: [
        { field: "nik", note: "16 digit angka (mis: 3201010101010001)" },
        { field: "nama", note: "Teks" },
        { field: "alamat", note: "Teks" },
        { field: "status_dtks", note: "`true`/`false` atau `menerima`/`tidak menerima`" },
        { field: "status_pkh", note: "`true`/`false` atau `menerima`/`tidak menerima`" },
        { field: "status_bpnt", note: "`true`/`false` atau `menerima`/`tidak menerima`" },
        { field: "penghasilan_bulanan", note: "Angka tanpa simbol (mis: 1500000)" },
        { field: "jumlah_tanggungan", note: "Angka (mis: 3)" },
        { field: "tahun", note: "4 digit tahun (mis: 2024)" },
        { field: "sumber", note: "Teks sumber data (mis: BPS)" },
    ],
    pendidikan: [
        { field: "nik", note: "16 digit angka" },
        { field: "nama", note: "Teks" },
        { field: "jenjang", note: "Teks (mis: SD, SMP, SMA, S1)" },
        { field: "sekolah", note: "Nama sekolah/universitas" },
        { field: "kota", note: "Teks kota sekolah" },
        { field: "tahun_lulus", note: "4 digit tahun (mis: 2020)" },
    ],
    dynamic: [
        { field: "nik", note: "16 digit angka unik (mis: 3201010101010001)" },
        { field: "nama", note: "Nama lengkap (mis: Budi Santoso)" },
        { field: "alamat", note: "Alamat lengkap sesuai domisili" },
        { field: "tanggal_lahir", note: "Format tanggal YYYY-MM-DD (mis: 1995-08-17)" },
        { field: "tahun", note: "Tahun pencatatan (mis: 2025)" },
        { field: "keterangan1", note: "Kolom tambahan teks sesuai kebutuhan (mis: status usaha, kondisi kesehatan)" },
        { field: "keterangan2", note: "Kolom tambahan angka sesuai kebutuhan (mis: Penghasilan, umur, dll)" },
    ],
};

const info = formatInfo[jenis] || [];

return (
    <div className="mb-4 p-4 border-l-4 border-[#800000] bg-[#fff4f4] rounded text-sm text-gray-700">
        <p className="font-semibold mb-2">
        📌 Format kolom & validasi untuk data <span className="capitalize">{jenis}</span>:
        </p>
        <ul className="list-disc list-inside text-gray-800 space-y-1">
        {info.map(({ field, note }) => (
            <li key={field}>
            <code className="text-[#800000] font-medium">{field}</code>{" "}
            <span className="text-gray-600">– {note}</span>
            </li>
        ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500">
            Pastikan nama kolom di file CSV Anda sama persis dengan format di atas, dan setiap baris memiliki data yang valid.
            {jenis !== "dynamic" && (
                <> Silahkan Download template untuk setiap jenis data untuk referensi lebih lanjut.</>
            )}
        </p>
    </div>
    );
}

export default DataFormatNote;
