// src/components/PublicRoute.jsx
import { Navigate } from "react-router-dom";
import { isLoggedIn } from "../utils/auth";

const PublicRoute = ({ children }) => {
    const isAuth = isLoggedIn();

    if (isAuth) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PublicRoute;
