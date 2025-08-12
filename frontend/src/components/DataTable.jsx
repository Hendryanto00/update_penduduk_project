import React from "react";
import { formatUTCtoWIB } from "../utils/time";
import { getUserFromToken } from "../utils/auth";
import { deleteDataById } from "../services/api";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { RefreshCw, Trash2 } from "lucide-react";

export default function DataTable({ data = [], page, totalPages, onPageChange, onRefresh }) {
    const user = getUserFromToken();

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: "Hapus data ini?",
            text: "Data yang dihapus tidak dapat dikembalikan.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Hapus",
            cancelButtonText: "Batal",
            customClass: {
                confirmButton: "bg-green-600 text-white px-4 py-2 rounded mr-2",
                cancelButton: "bg-red-600 text-white px-4 py-2 rounded",
            },
            buttonsStyling: false,
        });

        if (result.isConfirmed) {
            try {
                await deleteDataById(id);
                toast.success("Data berhasil dihapus");
                onRefresh();
            } catch (error) {
                console.error("Gagal menghapus:", error.response ? error.response.data : error.message);
                toast.error("Gagal menghapus data");
            }
        }
    };

    const renderStatusBadge = (status) => {
        const base = "px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1";
        switch (status) {
            case "pending":
                return <span className={`${base} bg-yellow-100 text-yellow-800`}>Pending</span>;
            case "success":
                return <span className={`${base} bg-green-100 text-green-800`}>Success</span>;
            case "failed":
                return <span className={`${base} bg-red-100 text-red-800`}>Failed</span>;
            default:
                return <span className={`${base} bg-gray-200 text-gray-600`}>{status}</span>;
        }
    };

    return (
        <div className="mt-6 text-gray-800 dark:text-white">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-lg sm:text-xl font-bold">📋 Daftar Data</h2>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        className="flex items-center gap-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-white px-3 py-1.5 rounded-lg shadow-sm transition"
                    >
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block w-full max-w-full overflow-x-hidden overflow-y-auto rounded-xl shadow ring-1 ring-gray-300 dark:ring-gray-700">
                <table className="w-full table-auto divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-medium">
                        <tr>
                            <th className="px-4 py-3 text-left">No</th>
                            <th className="px-4 py-3 text-left">Jenis</th>
                            <th className="px-4 py-3 text-left">Data</th>
                            <th className="px-4 py-3 text-left">Pemilik</th>
                            <th className="px-4 py-3 text-left">Upload</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Sinkron</th>
                            {user?.role === "admin" && <th className="px-4 py-3 text-center">Aksi</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={user?.role === "admin" ? 8 : 7} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                                    Tidak ada data.
                                </td>
                            </tr>
                        ) : (
                            data.map((item, index) => {
                                let parsedData;
                                try {
                                    parsedData = typeof item.data === "string" ? JSON.parse(item.data) : item.data;
                                } catch {
                                    parsedData = { error: "Data tidak valid" };
                                }

                                return (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                        <td className="px-4 py-3">{(page - 1) * 10 + index + 1}</td>
                                        <td className="px-4 py-3 capitalize">{item.jenis_data}</td>
                                        <td className="px-4 py-3 max-w-[250px] whitespace-pre-wrap break-words overflow-hidden truncate">
                                            {parsedData?.error ? (
                                                <span className="text-red-500">{parsedData.error}</span>
                                            ) : (
                                                Object.entries(parsedData).map(([key, value]) => (
                                                    <div key={key}><strong>{key}:</strong> {String(value)}</div>
                                                ))
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{item.owner}</td>
                                        <td className="px-4 py-3">{formatUTCtoWIB(item.created_at)}</td>
                                        <td className="px-4 py-3 text-center">{renderStatusBadge(item.status)}</td>
                                        <td className="px-4 py-3 text-center">
                                            {item.synced_at ? formatUTCtoWIB(item.synced_at) : "-"}
                                        </td>
                                        {user?.role === "admin" && (
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg shadow inline-flex items-center justify-center transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {data.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400">Tidak ada data.</p>
                ) : (
                    data.map((item, index) => {
                        let parsedData;
                        try {
                            parsedData = typeof item.data === "string" ? JSON.parse(item.data) : item.data;
                        } catch {
                            parsedData = { error: "Data tidak valid" };
                        }

                        return (
                            <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 border border-gray-200 dark:border-gray-700">
                                <div className="font-bold text-green-700 dark:text-green-400 mb-2">
                                    {index + 1 + (page - 1) * 10}. {item.jenis_data.toUpperCase()}
                                </div>
                                <div className="text-sm"><strong>Upload:</strong> {formatUTCtoWIB(item.created_at)}</div>
                                <div className="text-sm"><strong>Status:</strong> {renderStatusBadge(item.status)}</div>
                                <div className="text-sm"><strong>Sinkron:</strong> {item.synced_at ? formatUTCtoWIB(item.synced_at) : "-"}</div>
                                <div className="text-sm"><strong>Pemilik:</strong> {item.owner}</div>
                                <div className="mt-2">
                                    <strong>Data:</strong>
                                    {parsedData?.error ? (
                                        <div className="text-red-500 text-sm">{parsedData.error}</div>
                                    ) : (
                                        <div className="text-sm whitespace-pre-wrap">
                                            {Object.entries(parsedData).map(([key, value]) => (
                                                <div key={key}><strong>{key}:</strong> {String(value)}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {user?.role === "admin" && (
                                    <div className="mt-3">
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-red-600 hover:text-red-800 flex items-center text-sm"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" /> Hapus
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 text-sm text-gray-700 dark:text-gray-300 flex-wrap gap-2">
                    <div>
                        Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onPageChange(page - 1)}
                            disabled={page <= 1}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition text-xs sm:text-sm"
                        >
                            Prev
                        </button>
                        <button
                            onClick={() => onPageChange(page + 1)}
                            disabled={page >= totalPages}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition text-xs sm:text-sm"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
