# Copilot Talimatları (Minimal Stabil Mod)

Proje: .NET 10  
IDE: Visual Studio 2026  
Amaç: Stabil ve kontrollü kod üretimi.

---

## Genel

- Tüm dosyayı yeniden yazma.
- Sadece ilgili kod bloğunu değiştir.
- Açık talimat olmadan public API değiştirme.
- Gereksiz refactor yapma.
- Büyük kod üretimi yapma.

---

## Mimari

- Mevcut mimariyi koru (MVC / Razor Pages / Clean Architecture).
- Katman ihlali yapma.
- Yeni pattern ekleme (gerekmedikçe).

---

## .NET

- Async/await doğru kullan.
- Task.Result / Wait() kullanma.
- CancellationToken uygunsa destekle.
- Gereksiz ToList() kullanma.
- Magic number kullanma.
- Nullable reference type kurallarına uy.
- Olası null durumlarında güvenli kontrol ekle.

---

## Veritabanı

Açık talimat olmadan:
- Migration oluşturma.
- Column silme veya rename etme.

---

## Güvenlik

- Hassas veri loglama.
- Stack trace kullanıcıya gösterme.
- Exception swallow etme.

---

## Çıktı

- Kısa yaz.
- Gereksiz açıklama yapma.
- Emin değilsen sor.
