const fs = require('fs');
const path = require('path');

const folderPath = './players'; // Укажи путь к папке с фотками

fs.readdir(folderPath, (err, files) => {
  files.forEach(file => {
    const oldPath = path.join(folderPath, file);
    
    // Преобразуем имя: убираем умлауты, пробелы -> _, всё в нижний регистр
    const newName = file
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_") + ".png"; // Добавляем расширение

    const newPath = path.join(folderPath, newName);

    fs.rename(oldPath, newPath, (err) => {
      if (err) console.log(`Ошибка с ${file}`);
      else console.log(`${file} -> ${newName}`);
    });
  });
});