// Подготовка картинки подложки из файла пользователя. Сервера для файлов у редактора нет,
// поэтому картинка встраивается в сцену как data URL; большие сканы уменьшаются,
// чтобы файл сцены и автосохранение в браузере не раздувались.

export const MAX_SIDE_PX = 2000;

export interface PreparedImage {
  url: string; // data:image/...
  width: number; // пиксели после уменьшения
  height: number;
}

export async function prepareBackgroundImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("это не картинка");
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new window.Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("не удалось прочитать картинку"));
      i.src = src;
    });
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("браузер не дал нарисовать картинку");
    ctx.fillStyle = "#ffffff"; // прозрачные места скана — белые, как фон плана
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    // JPEG заметно компактнее PNG для сканов и фотографий плана
    return { url: canvas.toDataURL("image/jpeg", 0.85), width, height };
  } finally {
    URL.revokeObjectURL(src);
  }
}
