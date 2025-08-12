import React from "react";
import LayoutWithSidebar from "../components/LayoutWithSidebar";
import {
    FaUserShield,
    FaUser,
    FaUpload,
    FaDatabase,
    FaCheckCircle,
} from "react-icons/fa";

const LandingPage = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

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
                        </span>. Silakan kelola data sesuai peran Anda.
                    </p>
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
                        <h3 className="text-lg font-semibold text-gray-800">Pengelolaan Data</h3>
                        <p className="text-sm text-gray-500 mt-1">Data CSV Anda diproses otomatis setiap jam 10.00 WIB</p>
                    </div>
                </div>

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
                                    akan menyinkronkan data secara otomatis.
                                </p>
                            </div>
                        </div>

                        {user.role === "admin" && (
                            <div className="flex items-start gap-4">
                                <span className="text-indigo-600 text-xl mt-1">
                                    <FaUserShield />
                                </span>
                                <div>
                                    <h4 className="font-semibold text-gray-800">Kelola Pengguna</h4>
                                    <p className="text-sm text-gray-600">
                                        Admin dapat melihat semua data pengguna dan menghapus data tidak valid.
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
