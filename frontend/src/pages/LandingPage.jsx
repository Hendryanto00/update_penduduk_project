import React, { useEffect, useState } from "react";
import LayoutWithSidebar from "../components/LayoutWithSidebar";
import {
    FaUserShield,
    FaUser,
    FaUpload,
    FaDatabase,
    FaCheckCircle,
    FaBuilding,
    FaChartBar,
    FaClock
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { getProfile } from "../services/api";

const LandingPage = () => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "{}"));
    const [loading, setLoading] = useState(true);

    // Fungsi untuk mengambil data user terbaru dari API
    const fetchUserProfile = async () => {
        try {
            const userProfile = await getProfile();
            const updatedUser = {
                ...user,
                ...userProfile,
                focus_upload: userProfile.focus_upload || user.focus_upload,
                institution: userProfile.institution || user.institution
            };
            
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
        } catch (error) {
            console.error("Gagal mengambil profil user:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Jika data user tidak lengkap, fetch dari API
        if (!user.focus_upload || !user.institution) {
            fetchUserProfile();
        } else {
            setLoading(false);
        }
    }, []);

    // Fungsi untuk mendapatkan label fokus upload yang lebih user-friendly
    const getFocusUploadLabel = () => {
        switch (user.focus_upload) {
            case "penduduk": return "Data Penduduk";
            case "kemiskinan": return "Data Kemiskinan";
            case "pendidikan": return "Data Pendidikan";
            case "dinamis": return "Data Dinamis";
            default: return user.focus_upload || "Data";
        }
    };

    // Fungsi untuk mendapatkan path upload sesuai fokus
    const getUploadPath = () => {
        switch (user.focus_upload) {
            case "penduduk": return "/upload/penduduk";
            case "kemiskinan": return "/upload/kemiskinan";
            case "pendidikan": return "/upload/pendidikan";
            case "dinamis": return "/upload/dynamic";
            default: return "/upload/penduduk";
        }
    };

    // Fungsi untuk menangani institution yang null
    const getInstitution = () => {
        return user.institution || "Tidak ditentukan";
    };

    if (loading) {
        return (
            <LayoutWithSidebar>
                <div className="max-w-6xl mx-auto px-6 py-12 bg-white">
                    <p>Memuat data user...</p>
                </div>
            </LayoutWithSidebar>
        );
    }

    return (
        <LayoutWithSidebar>
            <div className="max-w-6xl mx-auto px-6 py-12 bg-white">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl font-bold text-gray-800 mb-2 tracking-tight">
                        Selamat Datang, {user.username || "Pengguna"} 👋
                    </h1>
                    <p className="text-lg text-gray-600">
                        Anda login sebagai{" "}
                        <span className="font-semibold text-indigo-700 capitalize">
                            {user.role || "N/A"}
                        </span>
                        {user.institution && (
                            <> dari <span className="font-semibold text-indigo-700">{getInstitution()}</span></>
                        )}
                    </p>
                </div>

                {/* Informasi User */}
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg mb-8">
                    <div className="flex items-center gap-4">
                        <FaBuilding className="text-blue-600 text-2xl" />
                        <div>
                            <h3 className="font-semibold text-blue-800">Informasi Akun</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div>
                                    <p className="text-sm text-blue-700">
                                        <span className="font-medium">Instansi:</span> {getInstitution()}
                                    </p>
                                    <p className="text-sm text-blue-700">
                                        <span className="font-medium">Role:</span> {user.role === "admin" ? "Administrator" : "User"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-blue-700">
                                        <span className="font-medium">Fokus Upload:</span> {getFocusUploadLabel()}
                                    </p>
                                    <p className="text-sm text-blue-700">
                                        <span className="font-medium">Status:</span> {user.is_approved ? "Terverifikasi" : "Menunggu Verifikasi"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ringkasan Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                        <div className="text-3xl text-indigo-700 mb-2">
                            {user.role === "admin" ? <FaUserShield /> : <FaUser />}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">Role Pengguna</h3>
                        <p className="text-sm text-gray-500 mt-1 capitalize">
                            {user.role === "admin" ? "Administrator" : "User Biasa"}
                        </p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                        <div className="text-3xl text-green-600 mb-2">
                            <FaCheckCircle />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">Status Sistem</h3>
                        <p className="text-sm text-gray-500 mt-1">Sinkronisasi Otomatis</p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                        <div className="text-3xl text-yellow-600 mb-2">
                            <FaDatabase />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">Fokus Data</h3>
                        <p className="text-sm text-gray-500 mt-1 capitalize">{getFocusUploadLabel()}</p>
                    </div>
                </div>

                {/* Status Info */}
                {!user.is_approved && (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-6 rounded-lg mb-8">
                        <div className="flex items-center gap-4">
                            <FaClock className="text-yellow-600 text-2xl" />
                            <div>
                                <h3 className="font-semibold">Menunggu Verifikasi Admin</h3>
                                <p className="text-sm mt-1">
                                    Akun Anda sedang menunggu verifikasi dari administrator. 
                                    Setelah diverifikasi, Anda akan dapat mengupload data {user.focus_upload} 
                                    dan mengakses fitur lainnya.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Fitur Tersedia */}
                <div className="bg-white rounded-xl p-8 border border-gray-200">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                        Fitur Utama
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="flex items-start gap-4">
                            <span className="text-indigo-600 text-xl mt-1">
                                <FaUpload />
                            </span>
                            <div>
                                <h4 className="font-semibold text-gray-800">Unggah Data CSV</h4>
                                <p className="text-sm text-gray-600">
                                    Upload file CSV sesuai format. Sistem akan memvalidasi dan menyimpan
                                    data secara otomatis untuk diproses.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <span className="text-indigo-600 text-xl mt-1">
                                <FaDatabase />
                            </span>
                            <div>
                                <h4 className="font-semibold text-gray-800">Pemantauan Sinkronisasi</h4>
                                <p className="text-sm text-gray-600">
                                    Cek status data Anda: pending, success, atau failed. Airflow
                                    akan menyinkronkan data secara otomatis setiap jam 10.00 WIB.
                                </p>
                            </div>
                        </div>

                        {user.role === "admin" && (
                            <>
                                <div className="flex items-start gap-4">
                                    <span className="text-indigo-600 text-xl mt-1">
                                        <FaUserShield />
                                    </span>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Kelola Pengguna</h4>
                                        <p className="text-sm text-gray-600">
                                            Admin dapat melihat semua data pengguna, menyetujui akun, 
                                            dan menghapus data tidak valid.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <span className="text-indigo-600 text-xl mt-1">
                                        <FaChartBar />
                                    </span>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">Akses Semua Data</h4>
                                        <p className="text-sm text-gray-600">
                                            Administrator dapat mengakses dan mengelola semua data 
                                            dari semua jenis dan semua pengguna.
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {user.role !== "admin" && (
                            <div className="flex items-start gap-4">
                                <span className="text-indigo-600 text-xl mt-1">
                                    <FaChartBar />
                                </span>
                                <div>
                                    <h4 className="font-semibold text-gray-800">Data Terfokus</h4>
                                    <p className="text-sm text-gray-600">
                                        Anda hanya dapat mengupload dan melihat data {user.focus_upload} 
                                        sesuai dengan fokus yang dipilih saat registrasi.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </LayoutWithSidebar>
    );
};

export default LandingPage;