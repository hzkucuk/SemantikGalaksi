import os
import asyncio
import aiohttp
import json
import requests
import re
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

# --- DİKKAT: API ANAHTARI ARTIK .ENV DOSYASINDAN GELİYOR ---
apiKey = os.getenv("API_KEY")

# Model adı .env'den alınsın, yoksa varsayılan olarak 1.5-flash kullanılsın
modelName = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

def clean_json_response(raw_text):
    """
    AI'dan gelen yanıttaki markdown bloklarını temizler.
    """
    cleaned = re.sub(r'```json\s*|```\s*', '', raw_text).strip()
    return cleaned

async def call_gemini_async(session, arabic_text, semaphore):
    """
    Gemini API'sini asenkron çağırır. Semaphore ile aynı anda kaç istek gideceği kontrol edilir.
    """
    if not apiKey:
        return []

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={apiKey}"

    prompt = f"""
    Aşağıdaki Arapça ayet metnindeki kelimelerin sülasi (üç harfli) köklerini (roots) bul.
    Sadece kök kelimeleri içeren bir JSON listesi döndür. Başka hiçbir metin ekleme.
    Örnek: ["حمد", "اله", "ربb"]
    Metin: {arabic_text}
    """

    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    async with semaphore:
        # Üstel geri çekilme (exponential backoff)
        for delay in [1, 2, 4, 8, 16]:
            try:
                async with session.post(url, json=payload, timeout=30) as response:
                    if response.status == 200:
                        result = await response.json()
                        raw_content = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '[]')
                        
                        cleaned_content = clean_json_response(raw_content)
                        try:
                            data = json.loads(cleaned_content)
                            if isinstance(data, dict):
                                return data.get('roots', [])
                            elif isinstance(data, list):
                                return data
                            return []
                        except json.JSONDecodeError:
                            print(f"JSON Parse Hatası: {cleaned_content[:50]}...")
                            return []

                    elif response.status == 429: # Rate limit
                        print(f"Rate limit (429) aşıldı, {delay}sn bekleniyor...")
                        await asyncio.sleep(delay)
                    else:
                        error_text = await response.text()
                        print(f"API Hatası ({response.status}): {error_text}")
                        # 5xx hatalarında belki beklenebilir ama 400'de çıkmak lazım
                        if 500 <= response.status < 600:
                             await asyncio.sleep(delay)
                        else:
                             break
            except Exception as e:
                print(f"Bağlantı Hatası: {e}")
                await asyncio.sleep(delay)
        
        return []

async def get_full_quran_with_ai_analysis():
    if not apiKey:
        print("HATA: 'API_KEY' bulunamadı! Lütfen .env dosyasını kontrol edin.")
        return

    print("1. ADIM: Ayetler ve Mealler indiriliyor (Senkron)...")
    
    try:
        # Arapça Orijinal Metin (Uthmani)
        arabic_res = requests.get("https://api.alquran.cloud/v1/quran/quran-uthmani").json()
        # Türkçe Meal (Diyanet)
        turkish_res = requests.get("https://api.alquran.cloud/v1/quran/tr.diyanet").json()

        ar_surahs = arabic_res['data']['surahs']
        tr_surahs = turkish_res['data']['surahs']

        if len(ar_surahs) != len(tr_surahs):
            print("HATA: Kaynaklar arasında sure sayısı uyumsuzluğu var.")
            return

    except Exception as e:
        print(f"HATA: Veri indirme başarısız: {e}")
        return

    print("\n2. ADIM: İlerleme kontrol ediliyor...")
    
    all_nodes = []
    processed_keys = set()
    
    # Kaydedilmiş dosya varsa yükle (Resume özelliği)
    progress_file = 'quran_ai_progress.json'
    if os.path.exists(progress_file):
        try:
            with open(progress_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                all_nodes = data.get("nodes", [])
                processed_keys = {item['id'] for item in all_nodes}
            print(f"Bilgi: Önceki oturumdan {len(all_nodes)} ayet yüklendi.")
        except Exception as e:
            print(f"Uyarı: İlerleme dosyası bozuk olabilir, baştan başlanacak. ({e})")
            processed_keys = set()
            all_nodes = []

    # İşlenecek ayetleri listele
    tasks_meta = []
    
    for s_idx in range(len(ar_surahs)):
        surah_name = ar_surahs[s_idx]['englishName']
        for a_idx in range(len(ar_surahs[s_idx]['ayahs'])):
            ar_ayah = ar_surahs[s_idx]['ayahs'][a_idx]
            tr_ayah = tr_surahs[s_idx]['ayahs'][a_idx]

            ayah_key = f"{ar_surahs[s_idx]['number']}:{ar_ayah['numberInSurah']}"
            
            if ayah_key in processed_keys:
                continue
                
            tasks_meta.append({
                "key": ayah_key,
                "surah": surah_name,
                "text": ar_ayah['text'],
                "translation": tr_ayah['text']
            })

    total_tasks = len(tasks_meta)
    print(f"İşlenecek {total_tasks} yeni ayet kaldı.")

    if total_tasks == 0:
        print("Tüm ayetler zaten işlenmiş!")
        return

    # Semaphore (Eşzamanlılık sınırı - API limitlerine göre ayarla)
    # Gemini 1.5 Flash için dakikada 15 istek ücretsiz (RPM), Pro 2 ise 2 RPM.
    # Eğer "Pay-as-you-go" kullanılıyorsa daha yüksek olabilir.
    # Güvenli olması için 5-10 civarı tutuyoruz.
    semaphore = asyncio.Semaphore(5)

    print("\n3. ADIM: AI Analizi Başlıyor (Asenkron)...")
    
    async with aiohttp.ClientSession() as session:
        # Batch işlemi: Her 20 ayette bir kaydet
        batch_size = 20
        
        for i in range(0, total_tasks, batch_size):
            batch = tasks_meta[i:i + batch_size]
            tasks = []
            
            for item in batch:
                tasks.append(process_single_ayah(session, semaphore, item))
            
            # Batch sonuçlarını bekle
            results = await asyncio.gather(*tasks)
            
            # Sonuçları ana listeye ekle
            all_nodes.extend(results)
            
            # İlerlemeyi kaydet
            try:
                with open(progress_file, 'w', encoding='utf-8') as f:
                    json.dump({"nodes": all_nodes}, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"Dosya yazma hatası: {e}")

            print(f"İlerleme: {min(i + batch_size, total_tasks)} / {total_tasks} tamamlandı.", end='\r')
            
            # API limitlerini rahatlatmak için kısa bir bekleme
            await asyncio.sleep(2)

    # Final dosyasını oluştur (Sıralı olarak)
    # id formatı "Sure:Ayet" olduğu için önce sure sonra ayet numarasına göre sırala
    def sort_key(node):
        s, a = map(int, node['id'].split(':'))
        return (s, a)

    all_nodes.sort(key=sort_key)

    with open('quran_data_full_ai.json', 'w', encoding='utf-8') as f:
        json.dump({"nodes": all_nodes}, f, ensure_ascii=False, indent=2)

    print(f"\n\nBAŞARILI! Tüm ayetler işlendi ve 'quran_data_full_ai.json' oluşturuldu.")

async def process_single_ayah(session, semaphore, item):
    roots = await call_gemini_async(session, item['text'], semaphore)
    # Boş gelse bile kaydet ki tekrar denemesin (veya boş dönsün diyebiliriz ama analiz edildi sayalım)
    return {
        "id": item['key'],
        "surah": item['surah'],
        "text": item['text'],
        "translation": item['translation'],
        "roots": roots
    }

if __name__ == "__main__":
    # Windows için event loop politikası (Python 3.8+ için gerekebilir)
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(get_full_quran_with_ai_analysis())
