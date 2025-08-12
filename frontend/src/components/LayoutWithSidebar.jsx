import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { removeToken } from "../utils/auth";
import { showConfirmation } from "../utils/confirm";
import { toast } from "react-toastify";
import {
    FaHome,
    FaUserFriends,
    FaRegListAlt,
    FaGraduationCap,
    FaDatabase,
    FaSignOutAlt,
    FaBars,
    FaTimes,
} from "react-icons/fa";
import logoDIY from "../assets/DIY.svg";

const LayoutWithSidebar = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        const confirmed = await showConfirmation({
            title: "Keluar Aplikasi?",
            text: "Apakah Anda yakin ingin logout?",
            icon: "warning",
            confirmText: "Ya, Logout",
            cancelText: "Batal",
        });

        if (confirmed) {
            removeToken();
            localStorage.removeItem("user");
            toast.success("Logout berhasil!");
            navigate("/login");
        }
    };

    const sidebarItems = [
        { icon: <FaHome />, label: "Beranda", path: "/" },
        { icon: <FaUserFriends />, label: "Data Penduduk", path: "/penduduk" },
        { icon: <FaRegListAlt />, label: "Data Kemiskinan", path: "/kemiskinan" },
        { icon: <FaGraduationCap />, label: "Data Pendidikan", path: "/pendidikan" },
        { icon: <FaDatabase />, label: "Lihat Semua Data", path: "/data-list" },
    ];
    
    const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user?.role === "admin") {
            sidebarItems.push({
                icon: <FaUserFriends />,
                label: "Kelola Pengguna",
                path: "/user-approval",
            });
        }
        
    const renderSidebar = () => (
        <div className="flex flex-col justify-between min-h-screen p-6">
            <nav className="flex flex-col gap-3">
                {sidebarItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => {
                                navigate(item.path);
                                setSidebarOpen(false);
                            }}
                            className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition ${
                                isActive
                                    ? "bg-[#800000] text-white"
                                    : "text-gray-700 hover:bg-gray-100"
                            }`}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>
            <div className="pt-4 border-t mt-6">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-red-600 bg-red-100 hover:bg-red-200 rounded-lg w-full transition"
                >
                    <FaSignOutAlt />
                    Keluar
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-white overflow-x-hidden">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 flex lg:hidden">
                    <div
                        className="fixed inset-0 bg-black opacity-30"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <aside className="relative w-64 bg-white border-r shadow-md z-50 overflow-y-auto flex flex-col justify-between min-h-screen">
                        <div className="flex justify-between items-center px-4 py-3 border-b">
                            <img src={logoDIY} alt="Logo DIY" className="h-8" />
                            <button onClick={() => setSidebarOpen(false)}>
                                <FaTimes className="text-xl" />
                            </button>
                        </div>
                        {renderSidebar()}
                    </aside>
                </div>
            )}

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 bg-white border-r shadow-md overflow-y-auto flex-col justify-between min-h-screen">
                {renderSidebar()}
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-x-hidden">
                {/* Header */}
                <header className="bg-white shadow px-4 lg:px-8 py-4 border-b flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        {/* Hamburger for mobile */}
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-xl">
                            <FaBars />
                        </button>
                        <img src={logoDIY} alt="Logo DIY" className="h-10 w-auto" />
                        <h1 className="text-xl font-bold text-[#800000]">
                            Sistem Sinkronisasi Data
                        </h1>
                    </div>
                </header>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-white">
                    <div className="max-w-7xl mx-auto">{children}</div>
                </main>
            </div>
        </div>
    );
};

export default LayoutWithSidebar;
