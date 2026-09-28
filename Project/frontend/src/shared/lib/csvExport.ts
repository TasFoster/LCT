/** Экспорт таблиц в CSV (открывается Excel/LibreOffice/Google Sheets без
 * дополнительных библиотек) — Blob + скачивание через скрытую ссылку. */

function escapeCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: unknown[][]): string {
  // ';' как разделитель и BOM — так Excel на русской локали не путает кодировку/разделитель.
  return '﻿' + rows.map((row) => row.map(escapeCell).join(';')).join('\r\n');
}

export function downloadCsv(filename: string, rows: unknown[][]): void {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
