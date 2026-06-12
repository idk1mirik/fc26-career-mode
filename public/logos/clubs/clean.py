import os
import unicodedata
import re

def clean_filename(filename):
    # 1. Разделяем символы (убираем умлауты: ü -> u)
    nfkd_form = unicodedata.normalize('NFKD', filename)
    text = "".join([c for c in nfkd_form if not unicodedata.combining(c)])
    
    # 2. Переводим в нижний регистр
    text = text.lower()
    
    # 3. Заменяем пробелы и дефисы на подчеркивания
    text = re.sub(r'[\s\-]+', '_', text)
    
    # 4. Оставляем только буквы, цифры и подчеркивания
    text = re.sub(r'[^a-z0-9_]', '', text)
    
    # 5. Убираем дубли подчеркиваний
    text = re.sub(r'_+', '_', text)
    
    return text + ".png"

folder = '.' # Папка, где лежат фотки
for filename in os.listdir(folder):
    if filename.endswith(".png"): # Или твой формат
        new_name = clean_filename(filename.replace('.png', ''))
        os.rename(filename, new_name)
        print(f"Переименовал: {filename} -> {new_name}")