// Function แปลงเวลาออกจากลานจอดเป็นข้อความตามภาษาที่เลือก (timezone ไทย, ค่าว่างหรือผิดรูปแบบคืน "")
function formatExitTime(value: string | null, locale: string): string {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "th-TH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Bangkok",
    }).format(date);
}

export { formatExitTime };
