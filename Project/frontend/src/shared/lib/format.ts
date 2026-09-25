/** Форматирование чисел и дат под русскую локаль. */

const nf = new Intl.NumberFormat('ru-RU');
const nf1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

export function formatNumber(value: number | null | undefined, digits: 0 | 1 | 2 = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  if (digits === 1) return nf1.format(value);
  if (digits === 2) return nf2.format(value);
  return nf.format(Math.round(value));
}

/** 42 500 000 → «42 500 000 ₽» */
export function formatRub(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${formatNumber(value)} ₽`;
}

/** 42 500 000 → «42,5 млн ₽» — для плиток и подписей графиков */
export function formatRubShort(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${nf1.format(value / 1_000_000_000)} млрд ₽`;
  if (abs >= 1_000_000) return `${nf1.format(value / 1_000_000)} млн ₽`;
  if (abs >= 1_000) return `${nf1.format(value / 1_000)} тыс. ₽`;
  return `${nf.format(value)} ₽`;
}

/** Со знаком: −18 400 000 / +3 200 000 */
export function formatSigned(value: number): string {
  if (value === 0) return '0';
  const sign = value > 0 ? '+' : '−';
  return `${sign}${nf.format(Math.abs(Math.round(value)))}`;
}

export function formatYears(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'не окупается';
  if (value < 1) {
    const months = Math.max(1, Math.round(value * 12));
    return `${months} ${pluralize(months, ['месяц', 'месяца', 'месяцев'])}`;
  }
  const rounded = Math.round(value * 10) / 10;
  return `${nf1.format(rounded)} ${pluralize(rounded, ['год', 'года', 'лет'])}`;
}

export function formatPct(value: number | null | undefined, digits: 0 | 1 = 0): string {
  if (value === null || value === undefined) return '—';
  return `${digits ? nf1.format(value) : nf.format(Math.round(value))} %`;
}

const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

export function formatTime(date: Date): string {
  return timeFmt.format(date);
}

/** pluralize(5, ['проект', 'проекта', 'проектов']) → «проектов» */
export function pluralize(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n);
  if (!Number.isInteger(abs)) return forms[1];
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
