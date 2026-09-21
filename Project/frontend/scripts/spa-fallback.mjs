// Статические хостинги (в том числе GitHub Pages) не знают о клиентском
// роутинге: прямой заход на /projects/1/dashboard даёт 404. Копия index.html
// под именем 404.html отдаёт приложение на любой неизвестный путь.
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve(import.meta.dirname, '..', 'dist');
const index = resolve(dist, 'index.html');

if (!existsSync(index)) {
  console.error('spa-fallback: dist/index.html не найден — сначала сборка');
  process.exit(1);
}

copyFileSync(index, resolve(dist, '404.html'));
console.log('spa-fallback: dist/404.html создан');
