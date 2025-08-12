import React, { useEffect, useState } from "react";
import UploadCSV from "../components/UploadCSV";
import DataFormatNote from "../components/DataFormatNote";
import DownloadTemplate from "../components/DownloadTemplate";
import { getUploadedData } from "../services/api";
import { getUser } from "../utils/auth";
import LayoutWithSidebar from "../components/LayoutWithSidebar";
import { FaClock } from "react-icons/fa";

function PendudukUpload() {
    const user = getUser();
    const isApproved = user?.is_approved === true;
    const isAdmin = user?.role === "admin";

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchData = async () => {
        try {
            const res = await getUploadedData("penduduk", page, 10);
            setTotalPages(Math.ceil(res.total_count / 10));
        } catch (err) {
            console.error("Gagal fetch data:", err);
        }
    };

    useEffect(() => {
        if (isApproved) {
            fetchData();
        }
    }, [page, isApproved]);

    return (
        <LayoutWithSidebar>
            <div className="max-w-4xl mx-auto p-6 space-y-6 bg-white rounded-xl shadow-xl mt-6">
                <h2 className="text-2xl font-bold text-[#800000]">Upload Data Penduduk</h2>

                {!isApproved ? (
                    <div className="flex items-start bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-md space-x-3">
                        <FaClock className="mt-1 text-yellow-600" />
                        <div>
                            <p className="font-semibold">Menunggu Persetujuan Admin</p>
                            <p className="text-sm">
                                Akun Anda belum disetujui. Anda belum dapat menggungah data. Mohon tunggu maksimal 1x24 jam.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Info login role → hanya ditampilkan jika sudah approved */}
                        {/* 
                        <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-md px-4 py-2">
                            Anda masuk sebagai <strong>{isAdmin ? "Admin" : "User"}</strong>.{" "}
                            {isAdmin
                                ? "Anda dapat menghapus dan melihat semua data."
                                : "Anda hanya bisa melihat dan upload data milik sendiri."}
                        </div>
                        */}

                        <DataFormatNote jenis="penduduk" />
                        <DownloadTemplate jenis="penduduk" />
                        <UploadCSV jenis="penduduk" afterUpload={fetchData} />
                    </>
                )}
            </div>
        </LayoutWithSidebar>
    );
}

export default PendudukUpload;
