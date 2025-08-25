import axios from "axios";
import { getToken, getRefreshToken, removeToken, saveToken, saveUser } from "../utils/auth";

// BASE_URL ambil dari env variable, fallback ke localhost
const BASE_URL = import.meta.env.VITE_API_BASE_URL

// Axios instance untuk request yang perlu token (Bearer)
const api = axios.create({ baseURL: BASE_URL });

// Interceptor untuk otomatis menambahkan header Authorization Bearer token
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

let isRefreshing = false;
let failedQueue = [];

// Fungsi untuk memproses antrian request yang menunggu refresh token
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Interceptor response untuk menangani token expired dan refresh otomatis
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Jika error 401 Unauthorized dan belum retry sebelumnya
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Jika proses refresh token sedang berjalan, tunggu hasilnya
            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers["Authorization"] = `Bearer ${token}`;
                        return api(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            isRefreshing = true;

            try {
                // Refresh token dan simpan token baru
                const data = await refreshToken();
                saveToken(data);
                api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
                processQueue(null, data.access_token);
                return api(originalRequest);
            } catch (refreshErr) {
                // Jika refresh gagal, hapus token dan redirect ke login
                processQueue(refreshErr, null);
                removeToken();
                window.location.href = "/login";
                return Promise.reject(refreshErr);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// Axios instance tanpa token (untuk login/register)
const plainApi = axios.create({ baseURL: BASE_URL });

/* ---------------- AUTH ---------------- */

// Fungsi login user
export const loginUser = async (username, password) => {
    const res = await plainApi.post("/auth/login", { username, password });
    saveToken(res.data);
    saveUser(res.data.user);
    return res.data;
};

// Fungsi registrasi user
export const registerUser = async (username, password, focus_upload, institution) => {
    const res = await plainApi.post("/auth/register", { 
        username, 
        password, 
        focus_upload, 
        institution 
    });
    return res.data;
};

// Ambil profil user yang sedang login
export const getProfile = async () => {
    const res = await api.get("/auth/me");
    if (res.data) {
        saveUser(res.data);
    }
    return res.data;
};


/* --------------- UPLOAD CSV --------------- */
export const uploadCSV = async (file, jenis_data) => {
    const formData = new FormData();
    formData.append("file", file);

    let url;
    if (jenis_data === "dynamic") {
        url = "/dynamic/upload";   // endpoint dynamic
    } else {
        url = `/api/upload_csv?jenis_data=${jenis_data}`;  // endpoint static
    }

    try {
        const res = await api.post(url, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return res.data;
    } catch (error) {
        // ✅ TANGKAP ERROR DENGAN LEBIH SPESIFIK
        if (error.response?.status === 400) {
            // Lempar error dengan detail untuk ditangani di component
            throw new Error(error.response.data.detail || "Bad request");
        }
        throw error;
    }
};


/* --------------- GET DATA BY JENIS --------------- */
export const getUploadedData = async (jenis_data, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const res = await api.get(`/api/data/${jenis_data}?limit=${limit}&offset=${offset}`);
    return res.data;
};

/* --------------- GET SEMUA DATA --------------- */
export const getAllData = async (jenis_data = "", search = "", page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
    });

    if (jenis_data) {
        params.append("jenis_data", jenis_data);
    }

    if (search) {
        params.append("search", search);
    }

    const res = await api.get(`/api/data?${params.toString()}`);
    return res.data;
};

/* --------------- DELETE DATA BY ID --------------- */
export const deleteDataById = async (id) => {
    const res = await api.delete(`/api/data/${id}`);
    return res.data;
};

/* --------------- REFRESH TOKEN --------------- */
export const refreshToken = async () => {
    const refresh = getRefreshToken();
    const res = await plainApi.post("/auth/refresh-token", null, {
        headers: {
            Authorization: `Bearer ${refresh}`,
        },
    });
    return res.data;
};

/* --------------- ADMIN: SETUJUI USER --------------- */
export const approveUser = async (userId) => {
    const res = await api.put(`/auth/approve-user/${userId}`);
    return res.data;
};

/* --------------- ADMIN: GET USER BELUM DISETUJUI --------------- */
export const getUnapprovedUsers = async () => {
    const res = await api.get("/auth/unapproved-users");
    return res.data;
};

/* --------------- ADMIN: REJECT USER --------------- */
export const rejectUser = async (userId) => {
    const res = await api.delete(`/auth/reject-user/${userId}`);
    return res.data;
};

/* --------------- GET DATA DYNAMIC --------------- */
export const getDynamicData = async (tableName, page = 1, limit = 10) => {
    const offset = (page - 1) * limit;
    const res = await api.get(`/dynamic/data/${tableName}?limit=${limit}&offset=${offset}`);
    return res.data;
};
