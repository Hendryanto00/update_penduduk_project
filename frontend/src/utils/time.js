export function formatUTCtoWIB(utcDateString) {
    if (!utcDateString) return "";
    
    // Paksa JavaScript menganggap waktu ini adalah UTC
    const utcFixed = utcDateString.replace(" ", "T") + "Z";
    const date = new Date(utcFixed);

    const options = {
        timeZone: "Asia/Jakarta",
        hour12: false,
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    };

    const formatter = new Intl.DateTimeFormat("id-ID", options);
    const parts = formatter.formatToParts(date);

    let tanggal = "";
    let jam = "";
    parts.forEach((part) => {
        if (part.type === "day" || part.type === "month" || part.type === "year") {
            tanggal += part.value + " ";
        }
        if (part.type === "hour") jam += part.value;
        if (part.type === "minute") jam += ":" + part.value;
    });

    return tanggal.trim() + " jam " + jam + " WIB";
}
