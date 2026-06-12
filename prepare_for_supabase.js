/**
 * prepare_for_supabase.js
 * Запускать из корня проекта: node prepare_for_supabase.js
 * Создаёт папку supabase_ready/ с правильно переименованными файлами.
 */

const fs = require("fs");
const path = require("path");

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const FOLDERS = {
  clubs:          "./public/logos/clubs",
  leagues:        "./public/logos/leagues",
  players:        "./public/images/players",
  "players-full": "./public/images/players-full",
};

const OUTPUT_DIR = "./supabase_ready";
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const [bucket, inputDir] of Object.entries(FOLDERS)) {
  if (!fs.existsSync(inputDir)) {
    console.log(`⚠️  Не найдено: ${inputDir}`);
    continue;
  }

  const outDir = path.join(OUTPUT_DIR, bucket);
  fs.mkdirSync(outDir, { recursive: true });

  const files = fs.readdirSync(inputDir);
  let ok = 0, skipped = 0;

  files.forEach((file) => {
    const ext = path.extname(file).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return;

    const newName = normalizeName(path.basename(file, ext)) + ".png";
    const src = path.join(inputDir, file);
    const dst = path.join(outDir, newName);

    fs.copyFileSync(src, dst);
    if (file !== newName) {
      console.log(`  [${bucket}] ${file} → ${newName}`);
    }
    ok++;
  });

  console.log(`✅ ${bucket}: ${ok} файлов${skipped ? `, пропущено: ${skipped}` : ""}\n`);
}

console.log("Готово! Загружай папки из supabase_ready/ в Supabase Storage.");
