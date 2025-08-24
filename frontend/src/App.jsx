// App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import PendudukUpload from "./pages/PendudukUpload";
import KemiskinanUpload from "./pages/KemiskinanUpload";
import PendidikanUpload from "./pages/PendidikanUpload";
import DynamicUpload from "./pages/DynamicUpload";  // ✅ Tambahan
import Login from "./pages/Login";
import Register from "./pages/Register";
import Unauthorized from "./pages/Unauthorized";
import PrivateRoute from "./components/PrivateRoute";
import PublicRoute from "./components/PublicRoute";
import DataList from "./pages/DataList";
import AdminUserApproval from "./pages/AdminUserApproval"; 

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <Router>
      <Routes>
        {/* 🔓 Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* 🔐 Protected Routes */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <LandingPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/penduduk"
          element={
            <PrivateRoute>
              <PendudukUpload />
            </PrivateRoute>
          }
        />
        <Route
          path="/kemiskinan"
          element={
            <PrivateRoute>
              <KemiskinanUpload />
            </PrivateRoute>
          }
        />
        <Route
          path="/pendidikan"
          element={
            <PrivateRoute>
              <PendidikanUpload />
            </PrivateRoute>
          }
        />
        <Route
          path="/data-list"
          element={
            <PrivateRoute>
              <DataList />
            </PrivateRoute>
          }
        />
        <Route
          path="/dynamic-upload"
          element={
            <PrivateRoute>
              <DynamicUpload />
            </PrivateRoute>
          }
        />
        {/* 🔐 Admin Only - Approval Page */}
        <Route
          path="/user-approval"
          element={
            <PrivateRoute>
              <AdminUserApproval /> 
            </PrivateRoute>
          }
        />
      </Routes>

      {/* 🔔 Toast Notifications */}
      <ToastContainer position="top-center" autoClose={2000} />
    </Router>
  );
}

export default App;
