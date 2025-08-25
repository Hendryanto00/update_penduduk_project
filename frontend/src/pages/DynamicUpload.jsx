// src/pages/DynamicUpload.jsx
import React, { useEffect, useState } from "react";
import UploadCSV from "../components/UploadCSV";
import DataFormatNote from "../components/DataFormatNote";
import { getDynamicData } from "../services/api"; 
import { getUser } from "../utils/auth";
import LayoutWithSidebar from "../components/LayoutWithSidebar";
import { FaClock } from "react-icons/fa";

function DynamicUpload() {
    const user = getUser();
    const isApproved = user?.is_approved === true;

    const [tableName, setTableName] = useState(null);
    const [data, setData] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchData = async () => {
        try {
            let response;
            if (user.focus_upload === 'dinamis') {
            response = await getAllData('dinamis', search, page, limit);
            } else {
            response = await getUploadedData(user.focus_upload, page, limit);
            }
            setData(response.data);
            setTotalPages(response.total_pages);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        if (isApproved && tableName) {
        fetchData();
        }
    }, [page, tableName, isApproved]);

    const handleAfterUpload = (res) => {
        if (res.table_name) {
        setTableName(res.table_name);
        setPage(1); 
        }
        fetchData();
    };

    return (
        <LayoutWithSidebar>
        <div className="max-w-4xl mx-auto p-6 space-y-6 bg-white rounded-xl shadow-xl mt-6">
            <h2 className="text-2xl font-bold text-[#800000]">Upload Data Dinamis</h2>

            {!isApproved ? (
            <div className="flex items-start bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-md space-x-3">
                <FaClock className="mt-1 text-yellow-600" />
                <div>
                <p className="font-semibold">Menunggu Persetujuan Admin</p>
                <p className="text-sm">
                    Akun Anda belum disetujui. Anda belum dapat menggungah data.
                    Mohon tunggu maksimal 1x24 jam.
                </p>
                </div>
            </div>
            ) : (
            <>
                <DataFormatNote jenis="dynamic" />
                <UploadCSV jenis="dynamic" afterUpload={handleAfterUpload} />

                {tableName && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold">Data dari {tableName}</h3>
                    <table className="w-full border mt-2">
                    <thead>
                        <tr>
                        {data[0] &&
                            Object.keys(data[0]).map((col, i) => (
                            <th key={i} className="border px-2 py-1">
                                {col}
                            </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, i) => (
                        <tr key={i}>
                            {Object.values(row).map((val, j) => (
                            <td key={j} className="border px-2 py-1">
                                {val}
                            </td>
                            ))}
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                )}
            </>
            )}
        </div>
        </LayoutWithSidebar>
    );
}

export default DynamicUpload;
