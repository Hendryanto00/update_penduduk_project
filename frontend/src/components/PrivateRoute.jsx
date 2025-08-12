// src/components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { isLoggedIn, getUser } from "../utils/auth";

const PrivateRoute = ({ children, requiredRole }) => {
    const isAuth = isLoggedIn();
    const user = getUser(); // Ambil user dari localStorage

    // Belum login
    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }

    // Jika butuh role tertentu (misal 'admin') dan user bukan role itu
    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default PrivateRoute;
