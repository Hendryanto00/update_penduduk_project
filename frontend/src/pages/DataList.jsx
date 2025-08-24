import React, { useEffect, useState, useCallback } from "react";
import { getUser } from "../utils/auth";
import { getAllData } from "../services/api";
import DataTable from "../components/DataTable";
import LayoutWithSidebar from "../components/LayoutWithSidebar";
import { toast } from "react-toastify";
import debounce from "lodash.debounce";
import { FaClock } from "react-icons/fa";

export default function DataList() {
    const user = getUser();
    const isApproved = user?.is_approved === true;
    const [data, setData] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const [jenisFilter, setJenisFilter] = useState(
        user.role === "admin" ? "" : "penduduk"
    );

    const limit = 10;

    const fetchData = async (searchTerm = search) => {
    try {
        setLoading(true);

        if (!jenisFilter && user.role !== "admin") {
            setData([]);
            setTotalPages(1);
            if (!toast.isActive("noJenis")) {
                toast.warn("Silakan pilih jenis data terlebih dahulu.", {
                    toastId: "noJenis"
                });
            }
            return;
        }

        const apiJenisFilter = jenisFilter === 'dynamic' ? 'all' : jenisFilter;
        const response = await getAllData(apiJenisFilter, searchTerm, page, limit);
        
        let filteredData = response.data || [];
        if (jenisFilter === 'dynamic') {
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
        [jenisFilter, page]
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
                                    {user.role === "admin" && <option value="">Semua</option>}
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
