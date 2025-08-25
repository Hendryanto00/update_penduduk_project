import React, { useEffect, useState, useCallback } from "react";
import { getUser } from "../utils/auth";
import { getAllData } from "../services/api";
import DataTable from "../components/DataTable";
import LayoutWithSidebar from "../components/LayoutWithSidebar";
import { toast } from "react-toastify";
import debounce from "lodash.debounce";
import { FaClock, FaBuilding } from "react-icons/fa";

export default function DataList() {
    const user = getUser();
    const isApproved = user?.is_approved === true;
    const [data, setData] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Untuk user biasa, langsung set jenis filter sesuai fokus upload mereka
    const [jenisFilter, setJenisFilter] = useState(
        user.role === "admin" ? "" : user.focus_upload || "penduduk"
    );

    const limit = 10;

    const fetchData = async (searchTerm = search) => {
        try {
            setLoading(true);

            if (!isApproved) {
                setData([]);
                setTotalPages(1);
                return;
            }

            // Untuk user biasa, hanya ambil data sesuai fokus upload mereka
            const apiJenisFilter = user.role === "admin" ? 
                (jenisFilter === 'dynamic' ? 'all' : jenisFilter) : 
                user.focus_upload;

            const response = await getAllData(apiJenisFilter, searchTerm, page, limit);
            
            let filteredData = response.data || [];
            
            // Filter untuk data dinamis (hanya untuk admin)
            if (user.role === "admin" && jenisFilter === 'dynamic') {
                const standarJenis = ['penduduk', 'kemiskinan', 'pendidikan'];
                filteredData = filteredData.filter(item => !standarJenis.includes(item.jenis_data));
            }
            
            setData(filteredData);
            setTotalPages(Math.ceil((response.total || 0) / limit));
        } catch (error) {
            console.error("Gagal mengambil data:", error);
            setData([]);
            toast.error("Gagal mengambil data.");
        } finally {
            setLoading(false);
        }
    };

    const debouncedFetch = useCallback(
        debounce((value) => {
            fetchData(value);
        }, 500),
        [jenisFilter, page, isApproved]
    );

    useEffect(() => {
        if (isApproved) {
            if (search) {
                debouncedFetch(search);
            } else {
                fetchData("");
            }

            return () => debouncedFetch.cancel();
        }
    }, [search, jenisFilter, page, isApproved]);

    return (
        <LayoutWithSidebar>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 bg-white dark:bg-gray-900 rounded-lg shadow min-h-[90vh]">
                <h1 className="text-xl sm:text-2xl font-semibold text-[#800000]">
                    Semua Data yang Telah Diupload
                </h1>

                {/* Informasi User */}
                <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                        <FaBuilding className="text-blue-600" />
                        <p className="font-semibold">Instansi: {user.institution || "Tidak ditentukan"}</p>
                    </div>
                    {user.role !== "admin" && (
                        <p className="font-semibold">Fokus Data: {user.focus_upload}</p>
                    )}
                </div>

                {!isApproved ? (
                    <div className="flex items-start bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-md space-x-3">
                        <FaClock className="mt-1 text-yellow-600" />
                        <div>
                            <p className="font-semibold">Menunggu Persetujuan Admin</p>
                            <p className="text-sm">
                                Akun Anda belum disetujui. Anda belum dapat melihat data.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Filter hanya untuk admin */}
                        {user.role === "admin" && (
                            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                                    <label className="font-medium text-gray-700 dark:text-white">Filter Jenis:</label>
                                    <select
                                        className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md shadow-sm bg-white dark:bg-gray-800 text-black dark:text-white w-full sm:w-auto"
                                        value={jenisFilter}
                                        onChange={(e) => {
                                            setPage(1);
                                            setJenisFilter(e.target.value);
                                        }}
                                    >
                                        <option value="">Semua</option>
                                        <option value="penduduk">Penduduk</option>
                                        <option value="kemiskinan">Kemiskinan</option>
                                        <option value="pendidikan">Pendidikan</option>
                                        <option value="dynamic">Data Dinamis</option>
                                    </select>
                                </div>

                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                                    <label className="font-medium text-gray-700 dark:text-white">Cari data:</label>
                                    <input
                                        type="text"
                                        className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md shadow-sm bg-white dark:bg-gray-800 text-black dark:text-white w-full sm:w-[300px]"
                                        placeholder="Masukan NIK atau Nama..."
                                        value={search}
                                        onChange={(e) => {
                                            setPage(1);
                                            setSearch(e.target.value);
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Untuk user biasa, tampilkan info fokus data */}
                        {user.role !== "admin" && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                                    <label className="font-medium text-gray-700 dark:text-white">Cari data:</label>
                                    <input
                                        type="text"
                                        className="border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-md shadow-sm bg-white dark:bg-gray-800 text-black dark:text-white w-full sm:w-[300px]"
                                        placeholder="Masukan NIK atau Nama..."
                                        value={search}
                                        onChange={(e) => {
                                            setPage(1);
                                            setSearch(e.target.value);
                                        }}
                                    />
                                </div>
                                <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-3 rounded-md">
                                    <p className="text-sm">Menampilkan data <strong>{user.focus_upload}</strong> yang Anda upload</p>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <p className="text-gray-500 dark:text-gray-400 italic">Memuat data...</p>
                        ) : (
                            <div className="overflow-visible">
                                <DataTable
                                    data={data}
                                    page={page}
                                    totalPages={totalPages}
                                    onPageChange={setPage}
                                    onRefresh={() => fetchData(search)}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </LayoutWithSidebar>
    );
}