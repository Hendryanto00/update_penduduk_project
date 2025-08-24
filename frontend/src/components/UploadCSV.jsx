import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { uploadCSV } from "../services/api"; 
import { showConfirmation } from "../utils/confirm";
import { FileUp, AlertTriangle, XCircle } from "lucide-react";
import { isUserApproved } from "../utils/auth";

function UploadCSV({ jenis, afterUpload }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState([]);
    const [columnError, setColumnError] = useState("");
    const [inputKey, setInputKey] = useState(Date.now());
    const fileInputRef = useRef();

    // cek akses user
    if (!isUserApproved()) {
        return (
        <div className="max-w-2xl mx-auto mt-10 p-6 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 rounded shadow">
            <h2 className="text-xl font-semibold mb-2">Akses Dibatasi</h2>
            <p>
            Akun Anda belum disetujui oleh admin. Silakan tunggu proses verifikasi
            sebelum dapat mengakses fitur ini.
            </p>
        </div>
        );
    }

    const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    setColumnError("");

    if (!file) {
        toast.error("⚠️ Harap pilih file CSV terlebih dahulu.");
        return;
    }

    if (file.type !== "text/csv") {
        toast.error("⚠️ File harus berformat .csv");
        return;
    }

    const confirmed = await showConfirmation({
        title: "Upload Data",
        text: "Apakah kamu yakin ingin mengupload file ini?",
        confirmText: "YA",
        cancelText: "TIDAK",
    });

    if (!confirmed) return;

    setLoading(true);
    try {
        const result = await uploadCSV(file, jenis);

        if (result.success) {
            toast.success(result.message);
            afterUpload?.(result);
        } else {
            if (result.errors?.length > 0) setErrors(result.errors);
            if (result.kolom_invalid) setColumnError(result.kolom_invalid);
            toast.error(`⚠️ Upload gagal: ${result.message}`);
        }
    } catch (error) {
        console.error("Upload error:", error);
        
        if (error.response?.status === 500) {
            toast.error("❌ Server error: Silakan coba lagi atau hubungi admin");
        } else if (error.response?.status === 400) {
            toast.error(`❌ ${error.response.data.detail}`);
        } else if (error.code === "NETWORK_ERROR") {
            toast.error("❌ Koneksi jaringan bermasalah");
        } else {
            toast.error("❌ Terjadi kesalahan tidak terduga");
        }
    } finally {
        setLoading(false);
        setFile(null);
        setInputKey(Date.now());
    }
};

    return (
        <form
        onSubmit={handleSubmit}
        className="space-y-6 p-8 bg-white shadow-xl rounded-2xl max-w-2xl mx-auto border border-gray-200 mt-8"
        >
        <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-800 mb-2 tracking-tight">
            Upload Data{" "}
            <span className="capitalize text-[#800000]">{jenis || "Dynamic"}</span>
            </h2>
            <p className="text-gray-500 text-sm">
            Hanya file berformat .csv yang diperbolehkan.
            </p>
        </div>

        <div className="flex flex-col gap-3 items-center">
            <input
            key={inputKey}
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-gray-800 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#800000]/90 file:text-white hover:file:bg-[#800000]"
            />
            {file && (
            <p className="text-sm text-gray-700">
                📄 File dipilih: <strong>{file.name}</strong>
            </p>
            )}
        </div>

        <button
            type="submit"
            disabled={loading}
            className={`flex items-center justify-center w-full gap-2 py-3 px-4 rounded-lg text-white font-semibold transition ${
            loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#800000] hover:bg-red-800"
            }`}
        >
            <FileUp size={18} />
            {loading ? "Mengupload..." : "Upload CSV"}
        </button>

        {columnError && (
            <div className="mt-6 flex gap-3 items-start border-l-4 border-yellow-600 bg-yellow-50 text-sm text-yellow-800 rounded p-4">
            <AlertTriangle className="mt-1 text-yellow-600" size={20} />
            <div>
                <p className="font-semibold mb-1">⚠️ Kolom tidak sesuai:</p>
                <p>{columnError}</p>
            </div>
            </div>
        )}

        {errors.length > 0 && (
            <div className="mt-6 flex gap-3 border-l-4 border-red-600 bg-red-50 text-sm text-red-800 rounded p-4">
            <XCircle className="mt-1 text-red-600" size={20} />
            <div>
                <p className="font-semibold mb-2">❌ Beberapa data gagal diproses:</p>
                <ul className="list-disc pl-5 space-y-1">
                {errors.map((err, i) => (
                    <li key={i}>
                    Baris {err.baris}: {err.alasan}
                    </li>
                ))}
                </ul>
            </div>
            </div>
        )}
        </form>
    );
}

export default UploadCSV;
