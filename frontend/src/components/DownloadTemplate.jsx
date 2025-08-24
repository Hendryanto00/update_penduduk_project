import React, { useState } from "react";
import { getToken } from "../utils/auth";

function DownloadTemplate({ jenis }) {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async (e) => {
        e.preventDefault();
        setIsDownloading(true);
        
        try {
            const token = getToken(); 
            if (!token) {
                toast.error("Silakan login terlebih dahulu");
                return;
            }

            const response = await fetch(`${BASE_URL}/template/${jenis}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Download gagal');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${jenis}_template.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success("Template berhasil didownload");

        } catch (error) {
            console.error("Download error:", error);
            toast.error("Gagal mendownload template");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-block mb-4 px-4 py-2 bg-[#800000] text-white rounded hover:bg-[#600000] transition disabled:opacity-50"
        >
            {isDownloading ? "Downloading..." : `Download Template ${jenis.charAt(0).toUpperCase() + jenis.slice(1)}`}
        </button>
    );
}

export default DownloadTemplate;