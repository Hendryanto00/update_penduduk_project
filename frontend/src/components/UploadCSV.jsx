import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { uploadCSV } from "../services/api"; 
import { showConfirmation } from "../utils/confirm";
import { FileUp, AlertTriangle, XCircle, Info } from "lucide-react";
import { isUserApproved } from "../utils/auth";

function UploadCSV({ jenis, afterUpload }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState([]);
    const [columnError, setColumnError] = useState("");
    const [inputKey, setInputKey] = useState(Date.now());
    const fileInputRef = useRef();

    // Fungsi untuk menangani error secara terpusat
    const handleErrorResponse = (errorData) => {
        if (errorData.kolom_extra) {
            return `File mengandung kolom yang tidak diizinkan: ${errorData.kolom_extra.join(', ')}. 
                    Kolom standar untuk '${jenis}': ${errorData.kolom_yang_diizinkan?.join(', ')}`;
        } else if (errorData.kolom_missing) {
            return `Kolom wajib tidak lengkap: ${errorData.kolom_missing.join(', ')}. 
                    Kolom yang dibutuhkan: ${errorData.kolom_yang_dibutuhkan?.join(', ')}`;
        } else if (errorData.detail) {
            return errorData.detail;
        } else if (errorData.message) {
            return errorData.message;
        }
        return "Terjadi kesalahan tidak terduga";
    };

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
                
                // Gunakan fungsi terpusat untuk menangani error
                const errorMessage = handleErrorResponse(result);
                if (errorMessage) {
                    setColumnError(errorMessage);
                    // Hanya tampilkan "Upload gagal" di toast
                    toast.error("❌ Upload gagal");
                }
            }
        } catch (error) {
            console.error("Upload error:", error);
            
            if (error.response?.data) {
                const errorMessage = handleErrorResponse(error.response.data);
                setColumnError(errorMessage);
                // Hanya tampilkan "Upload gagal" di toast
                toast.error("❌ Upload gagal");
            } else if (error.message) {
                setColumnError(error.message);
                // Hanya tampilkan "Upload gagal" di toast
                toast.error("❌ Upload gagal");
            } else {
                setColumnError("Terjadi kesalahan tidak terduga");
                // Hanya tampilkan "Upload gagal" di toast
                toast.error("❌ Upload gagal");
            }
        } finally {
            setLoading(false);
            setFile(null);
            setInputKey(Date.now());
        }
    };

    // Komponen untuk menampilkan error schema
    const SchemaErrorDisplay = () => {
        if (!columnError) return null;
        
        const isSchemaError = columnError.includes("sama dengan data standar") || 
                            columnError.includes("Field tidak diizinkan") ||
                            columnError.includes("Kolom tidak diizinkan") ||
                            columnError.includes("sudah ada dengan schema berbeda");
        
        const isMissingColumnError = columnError.includes("Kolom wajib tidak lengkap") ||
                                   columnError.includes("Kolom wajib hilang");
        
        if (isSchemaError) {
            return (
                <div className="mt-6 flex gap-3 items-start border-l-4 border-red-600 bg-red-50 text-sm text-red-800 rounded p-4">
                    <XCircle className="mt-1 text-red-600" size={20} />
                    <div className="w-full">
                        <p className="font-semibold mb-2">❌ Konflik Schema:</p>
                        <p className="text-red-700">
                            {columnError}
                        </p>
                        {jenis === "dynamic" && (
                            <p className="mt-3 text-red-700 text-xs">
                                <strong>Solusi:</strong> Ubah nama file CSV Anda (misal: "data_tambahan.csv") 
                                dan upload kembali.
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        
        if (isMissingColumnError) {
            return (
                <div className="mt-6 flex gap-3 items-start border-l-4 border-orange-600 bg-orange-50 text-sm text-orange-800 rounded p-4">
                    <AlertTriangle className="mt-1 text-orange-600" size={20} />
                    <div>
                        <p className="font-semibold mb-1">⚠️ Kolom Wajib Tidak Lengkap:</p>
                        <p>{columnError}</p>
                        <p className="mt-2 text-orange-700 text-xs">
                            <strong>Solusi:</strong> Pastikan file CSV Anda memiliki semua kolom yang diperlukan.
                        </p>
                    </div>
                </div>
            );
        }
        
        return (
            <div className="mt-6 flex gap-3 items-start border-l-4 border-yellow-600 bg-yellow-50 text-sm text-yellow-800 rounded p-4">
                <AlertTriangle className="mt-1 text-yellow-600" size={20} />
                <div>
                    <p className="font-semibold mb-1">⚠️ Error Validasi:</p>
                    <p>{columnError}</p>
                </div>
            </div>
        );
    };

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
                
                {jenis === "dynamic" && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <Info size={16} className="text-blue-600 mt-0.5" />
                            <p className="text-xs text-blue-700">
                                <strong>Tips:</strong> Hindari nama file yang sama dengan data standar 
                                (penduduk, kemiskinan, pendidikan) jika kolomnya berbeda. Jika ingin 
                                menambah kolom baru, gunakan nama file yang berbeda.
                            </p>
                        </div>
                    </div>
                )}
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

            {/* Menampilkan error */}
            <SchemaErrorDisplay />

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