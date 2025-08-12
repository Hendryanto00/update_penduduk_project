// utils/confirm.js
import Swal from "sweetalert2";

export const showConfirmation = async ({
    title = "Konfirmasi",
    text = "Apakah Anda yakin?",
    icon = "question",
    confirmText = "Ya",
    cancelText = "Tidak",
}) => {
    const result = await Swal.fire({
        title,
        text,
        icon,
        background: "#ffffff",
        color: "#000000",
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        buttonsStyling: false, // Wajib agar customClass aktif
        customClass: {
            confirmButton:
                "bg-green-600 text-white px-4 py-2 rounded mr-2 hover:bg-green-700",
            cancelButton:
                "bg-[#800000] text-white px-4 py-2 rounded hover:bg-red-900",
        },
    });

    return result.isConfirmed;
};
