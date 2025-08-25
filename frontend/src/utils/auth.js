import { jwtDecode } from "jwt-decode"; // ✅ Named import untuk versi 4+

export const saveToken = ({ access_token, refresh_token }) => {
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
};

export const getToken = () => {
    return localStorage.getItem("access_token");
};

export const getRefreshToken = () => {
    return localStorage.getItem("refresh_token");
};

export const removeToken = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
};

export const getUserFromToken = () => {
    const token = getToken();
    if (!token) return null;
    try {
        const decoded = jwtDecode(token);
        return decoded;
    } catch (error) {
        console.error("Token decoding failed:", error);
        return null;
    }
};

export const isLoggedIn = () => {
    return !!getToken();
};

export const saveUser = (user) => {
    localStorage.setItem("user", JSON.stringify(user));
};

export const getUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        return JSON.parse(userStr);
    }
    return null;
};

export function isUserApproved() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.is_approved === true;
}
