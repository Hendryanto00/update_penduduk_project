import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/api";
import { toast } from "react-toastify";
import { Eye, EyeOff } from "lucide-react";
import logoDIY from "../assets/DIY.svg";

function Register() {
    const [form, setForm] = useState({ 
        username: "", 
        password: "", 
        focus_upload: "penduduk", 
        institution: "" 
    });
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await registerUser(form.username, form.password, form.focus_upload, form.institution);
            toast.success("Registrasi berhasil! Silakan login.");
            navigate("/login");
        } catch (err) {
            if (err.response && err.response.status === 400) {
                toast.error("Username sudah terdaftar. Jika itu akun Anda, silakan login.");
            } else {
                toast.error("Gagal registrasi. Silakan coba lagi nanti.");
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
                            <p className="text-sm text-center text-gray-600 mt-2">
                                Daftarkan akun Anda untuk mulai menggunakan sistem ini.
                            </p>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-6">
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
                            
                            {/* Field Baru: Fokus Upload */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Fokus Upload Data
                                </label>
                                <select
                                    name="focus_upload"
                                    value={form.focus_upload}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:outline-none transition"
                                >
                                    <option value="penduduk">Penduduk</option>
                                    <option value="kemiskinan">Kemiskinan</option>
                                    <option value="pendidikan">Pendidikan</option>
                                    <option value="dinamis">Data Dinamis</option>
                                </select>
                            </div>
                            
                            {/* Field Baru: Instansi */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Instansi/Asal
                                </label>
                                <input
                                    type="text"
                                    name="institution"
                                    value={form.institution}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#800000] focus:outline-none transition"
                                    placeholder="Contoh: Dinas Pendidikan, BPS, dll."
                                />
                            </div>
                            
                            <button
                                type="submit"
                                className="w-full py-2 bg-[#800000] hover:bg-[#a30000] text-white font-semibold rounded-lg transition duration-300"
                            >
                                Daftar
                            </button>
                            <p className="text-sm text-center text-gray-600">
                                Sudah punya akun?{" "}
                                <Link to="/login" className="text-[#800000] hover:underline">
                                    Login di sini
                                </Link>
                            </p>
                        </form>
                    </div>

                    <div className="hidden md:flex flex-col justify-center items-center w-1/2 bg-transparent p-10 text-white">
                        <div className="text-center space-y-6">
                            <h2 className="text-3xl font-bold">Selamat Datang</h2>
                            <p className="text-sm text-gray-200">Sebelum mendaftar, harap perhatikan hal-hal berikut:</p>
                            <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside text-left">
                                <li>Isi data pribadi Anda dengan benar dan sesuai identitas</li>
                                <li>Gunakan username yang aktif dan mudah diingat</li>
                                <li>Buat password yang kuat dan rahasiakan dari orang lain</li>
                                <li>Akun akan ditinjau admin sebelum aktif</li>
                                <li>Setelah aktif Anda dapat mengakses fitur yang tersedia</li>
                                <li>Pilih fokus upload data sesuai kebutuhan Anda</li>
                                <li>Isi instansi/asal untuk verifikasi identitas</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;