// src/components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import { isLoggedIn, getUser } from "../utils/auth";

const PrivateRoute = ({ children, requiredRole }) => {
    const isAuth = isLoggedIn();
    const user = getUser(); 

    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default PrivateRoute;
