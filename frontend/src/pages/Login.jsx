import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import { loginUser, getProfile } from "../services/api";
import { saveToken, saveUser } from "../utils/auth";
import logoDIY from "../assets/DIY.svg";
import Swal from 'sweetalert2';


const Login = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ username: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
    e.preventDefault();
    try {
        const res = await loginUser(form.username, form.password);

        // Simpan token
        saveToken({
            access_token: res.access_token,
            refresh_token: res.refresh_token,
        });

        // Ambil profil user dari backend
        const user = await getProfile();

        // Simpan user ke localStorage
        saveUser({
            username: user.username,
            role: user.role,
            is_approved: user.is_approved,
        });

        // Tampilkan notifikasi
        toast.success("Login berhasil!");

        // Redirect ke halaman utama
        navigate("/");
    } catch (err) {
        const message = err.response?.data?.detail;

        if (message?.includes("belum disetujui")) {
            Swal.fire({
                icon: 'info',
                title: 'Akun Belum Disetujui',
                text: 'Silakan tunggu persetujuan admin sebelum bisa login.',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400',
                },
                buttonsStyling: false,
            });
        } else if (message === "Invalid credentials" || message === "User tidak ditemukan" || message === "Password salah") {
            Swal.fire({
                icon: 'error',
                title: 'Login Gagal',
                text: 'Username atau password salah.',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400',
                },
                buttonsStyling: false,
            });
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Terjadi Kesalahan',
                text: 'Akun tidak ditemukan. Mungkin Anda belum mendaftar atau akun Anda telah dihapus oleh admin karena alasan tertentu.',
                confirmButtonText: 'OK',
                customClass: {
                    confirmButton: 'bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-400',
                },
                buttonsStyling: false,
            });
        }
    }
};

    return (
        <div className="w-screen h-full min-h-screen bg-gradient-to-br from-[#800000] via-[#4a0000] to-black flex items-center justify-center py-10 px-4 relative overflow-hidden">
            <div className="absolute w-[600px] h-[600px] bg-[#ffffff22] rounded-full top-[-100px] left-[-100px] blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute w-[400px] h-[400px] bg-[#ffffff11] rounded-full bottom-[-100px] right-[-50px] blur-2xl opacity-10"></div>

            <div className="backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl rounded-2xl w-full max-w-4xl flex flex-col overflow-hidden">
                <div className="w-full flex flex-col md:flex-row">
                    <div className="w-full md:w-1/2 p-10 bg-white bg-opacity-90 backdrop-blur-lg">
                        <div className="flex flex-col items-center mb-6">
                            <img src={logoDIY} alt="Logo DIY" className="h-16 mb-4" />
                            <h1 className="text-2xl font-bold text-[#800000] text-center">Sistem Sinkronisasi Data</h1>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={form.username}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:outline-none transition"
                                    placeholder="Masukkan username"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={form.password}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:outline-none transition"
                                        placeholder="Masukkan password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-gray-500"
                                        title={showPassword ? "Sembunyikan Password" : "Lihat Password"}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-2 bg-[#800000] hover:bg-[#a30000] text-white font-semibold rounded-lg transition duration-300"
                            >
                                Login
                            </button>
                            <p className="text-sm text-center text-gray-600">
                                Belum punya akun?{" "}
                                <Link to="/register" className="text-[#800000] hover:underline">
                                    Daftar di sini
                                </Link>
                            </p>
                        </form>
                    </div>

                    <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-transparent p-10 text-white">
                        <div className="text-center space-y-6">
                            <h2 className="text-3xl font-bold">Selamat Datang</h2>
                            <p className="text-sm text-gray-200">Masuk untuk melanjutkan penggunaan sistem</p>
                            <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside text-left">
                                <li>Gunakan akun Anda sendiri dan bertanggung jawab</li>
                                <li>Hindari akses dari jaringan publik atau tidak aman</li>
                                <li>Pastikan data Anda valid dan sesuai format</li>
                                <li>Logout setelah selesai, terutama di perangkat umum</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
