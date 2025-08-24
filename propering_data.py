import requests
import json
import os

# API endpoint
url = "https://api.radkod.com/parolla/api/v1/modes/unlimited"  # kendi endpointini yaz

# Kaydedilecek klasör
save_dir = "public/data"
os.makedirs(save_dir, exist_ok=True)

for i in range(1, 1001):  # 1'den 30'a kadar
    # API isteği
    response = requests.get(url)
    data = response.json()

    # Sadece "questions" kısmını al
    questions = data["data"]["questions"]

    # Dosya adı
    file_path = os.path.join(save_dir, f"questions{i}.json")

    # JSON olarak kaydet
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=4)

    print(f"{file_path} kaydedildi.")