import React from "react";

// Komponen untuk download template CSV berdasarkan jenis data
function DownloadTemplate({ jenis }) {
    // Ambil base URL dari env, fallback ke localhost
    const BASE_URL = import.meta.env.VITE_API_BASE_URL
    const url = `${BASE_URL}/template/${jenis}`;

    return (
        <a
            href={url}
            download={`${jenis}_template.csv`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mb-4 px-4 py-2 bg-[#800000] text-white rounded hover:bg-[#600000] transition"
        >
            Download Template {jenis.charAt(0).toUpperCase() + jenis.slice(1)}
        </a>
    );
}

export default DownloadTemplate;
