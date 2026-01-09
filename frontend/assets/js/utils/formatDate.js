export function formatDate(dateString) {
    if (!dateString) return '';
    // Converte YYYY-MM-DD para DD/MM
    const date = new Date(dateString + 'T00:00:00');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
}