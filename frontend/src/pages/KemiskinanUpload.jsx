import React, { useEffect, useState } from "react";
import UploadCSV from "../components/UploadCSV";
import DataFormatNote from "../components/DataFormatNote";
import DownloadTemplate from "../components/DownloadTemplate";
import { getUploadedData } from "../services/api";
import { getUser } from "../utils/auth";
import LayoutWithSidebar from "../components/LayoutWithSidebar";
import { FaClock } from "react-icons/fa";

function KemiskinanUpload() {
    const user = getUser();
    const isApproved = user?.is_approved === true;

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchData = async () => {
        try {
            const res = await getUploadedData("kemiskinan", page, 10);
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
                <h2 className="text-2xl font-bold text-[#800000]">Upload Data Kemiskinan</h2>

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
                        <DataFormatNote jenis="kemiskinan" />
                        <DownloadTemplate jenis="kemiskinan" />
                        <UploadCSV jenis="kemiskinan" afterUpload={fetchData} />
                    </>
                )}
            </div>
        </LayoutWithSidebar>
    );
}

export default KemiskinanUpload;
