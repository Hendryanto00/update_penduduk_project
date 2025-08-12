import React, { useEffect, useState } from "react";
import { getUnapprovedUsers, approveUser, rejectUser } from "../services/api";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import LayoutWithSidebar from "../components/LayoutWithSidebar";
import { FaUserCheck, FaUserTimes } from "react-icons/fa";

const AdminUserApproval = () => {
    const [users, setUsers] = useState([]);

    const fetchUsers = async () => {
        try {
            const data = await getUnapprovedUsers();
            setUsers(data);
        } catch (err) {
            toast.error("Gagal mengambil data user.");
        }
    };

    const handleApprove = async (userId) => {
        const result = await Swal.fire({
            title: "Setujui user ini?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Setujui",
            cancelButtonText: "Batal",
            customClass: {
                confirmButton: "bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded mr-2",
                cancelButton: "bg-red-600 hover:bg-red-900 text-white font-medium px-4 py-2 rounded mr-2",
            },
            buttonsStyling: false,
        });

        if (result.isConfirmed) {
            try {
                await approveUser(userId);
                toast.success("User berhasil disetujui!");
                fetchUsers(); // refresh list
            } catch (err) {
                toast.error("Gagal menyetujui user.");
            }
        }
    };

    const handleReject = async (userId) => {
        const result = await Swal.fire({
            title: "Tolak user ini?",
            text: "User akan dihapus dari sistem.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Tolak",
            cancelButtonText: "Batal",
            customClass: {
                confirmButton: "bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded mr-2",
                cancelButton: "bg-red-600 hover:bg-red-900 text-white font-medium px-4 py-2 rounded mr-2",
            },
            buttonsStyling: false,
        });

        if (result.isConfirmed) {
            try {
                await rejectUser(userId);
                toast.success("User berhasil ditolak dan dihapus.");
                fetchUsers();
            } catch (err) {
                toast.error("Gagal menolak user.");
            }
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    return (
        <LayoutWithSidebar>
            <div className="max-w-5xl mx-auto px-6 py-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <FaUserTimes className="text-red-500" />
                    Persetujuan User Baru
                </h2>

                {users.length === 0 ? (
                    <div className="bg-yellow-100 text-yellow-800 px-4 py-3 rounded-md shadow">
                        Tidak ada user yang menunggu persetujuan.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                className="bg-white border border-gray-200 rounded-xl shadow-md p-5 flex items-center justify-between transition-all hover:shadow-lg"
                            >
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">{user.username}</h3>
                                    <p className="text-sm text-gray-500">Role: {user.role}</p>
                                    <span className="inline-block mt-2 text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">
                                        Belum Disetujui
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApprove(user.id)}
                                        className="bg-green-600 text-white flex items-center gap-2 px-4 py-2 rounded-md hover:bg-green-700 transition-all"
                                    >
                                        <FaUserCheck />
                                        Setujui
                                    </button>
                                    <button
                                        onClick={() => handleReject(user.id)}
                                        className="bg-red-600 text-white flex items-center gap-2 px-4 py-2 rounded-md hover:bg-red-700 transition-all"
                                    >
                                        <FaUserTimes />
                                        Tolak
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </LayoutWithSidebar>
    );
};

export default AdminUserApproval;
