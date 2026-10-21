# 🎓 Deniz 9. Sınıf Matematik & Deneme Sınavı Takip Platformu

**2026 Türkiye Yüzyılı Maarif Modeli** 9. Sınıf Matematik müfredatına tam uyumlu; **Deniz** için özel olarak geliştirilmiş bulut tabanlı, mobil/tablet PWA uyumlu, optik test & etkinlik takip, çözülemeyen soru havuzu, deneme sınavı net analizi ve haftalık otomatik e-posta raporlama sistemidir.

---

## 📌 1. Proje Özeti ve Başlangıç Bilgileri

- **Öğrenci:** Deniz (9. Sınıf)
- **Program Başlangıç Tarihi:** **21 Ekim 2026 Çarşamba**
- **Program Bitiş Tarihi:** **1 Haziran 2027 Salı** (Okul bitmeden tüm müfredat tamamlanır)
- **Toplam Süre:** **224 Takvim Günü • 278 Görev**
- **Dengeli Günlük Dağılım Kuralı:**
  - 🏫 **Hafta İçi (Okul Günleri):** Günlük **1 Görev** (1 Test VEYA 2 Sayfa Etkinlik ~20-25 dk)
  - 🛋️ **Hafta Sonu (Tatil Günleri):** Günlük **2 Görev** (Örn: Cumartesi 1 Etkinlik + 1 Test; Pazar 2 Test ~40-45 dk)
- **Platform Türü:** Mobil & Tablet Uyumlu PWA Web Uygulaması (Kısayol ve uygulama olarak ana ekrana indirilebilir)
- **Bulut Mimarisi:** Google Apps Script + Google Drive senkronizasyonu
- **Otomatik Raporlama:** **Her Cuma akşamı saat 21:00'de** haftalık gelişim ve karne raporu e-postası
- **Günlük Hatırlatma:** Her gün saat 17:00'de yapılmayan ödevler için otomatik e-posta hatırlatması
- **Özel Bölüm:** Çoklu ders Genel ve Branş **Deneme Sınavı** takip ve net analiz modülü

---

## 📚 2. Takip Edilen Kitaplar ve Dağılım

| Kitap Adı | Yayınevi / Tür | Sayfa | Görev Kapsamı | Pedagojik Rolü |
| :--- | :--- | :---: | :---: | :--- |
| **MatBook 9. Sınıf VDK** | Video Destekli Defter | 268 | **54 Etkinlik + 47 Test** | Konu kavrama, 2 sayfalık mikro etkinlikler, Bilgi ve Beceri Temelli sorular |
| **Orijinal 9. Sınıf SB** | Soru Bankası (2026 Maarif) | 337 | **177 Test (~2.100 Soru)** | Kazanım kavrama, Süreç kontrol, Beceri temelli ve Tema tarama testleri |
| **TOPLAM PROGRAM** | **2 Temel Kaynak** | **605 Sayfa** | **224 Gün • 278 Görev** | **Tüm 9. Sınıf Maarif Müfredatı (1 Haziran Bitiş)** |

### 🎯 Pedagojik Konu Akışı:
Programda her yeni konu şu sıra ile işlenir:
1. **Adım 1 (Kavrama):** MatBook VDK'den **2 sayfalık etkinlik** (Örnek çözümler, boşluk doldurma).
2. **Adım 2 (Pekiştirme):** MatBook VDK'den **1 adet Bilgi Temelli / Beceri Temelli Test**.
3. **Adım 3 (Ustalık):** Orijinal Soru Bankası'ndan **Kazanım & Süreç Kontrol Testleri**.
4. **Adım 4 (Derinleşme):** Orijinal Beceri Temelli ve Tema Tarama Testleri.

---

## 🚀 3. Hızlı Başlangıç (Bilgisayarda Çalıştırma)

Klasördeki **`baslat.bat`** dosyasına çift tıklayınız. Tarayıcınız otomatik olarak `http://localhost:8080` adresinde açılacaktır.

---

## 📱 4. Tablet ve Telefona Uygulama (PWA) Olarak İndirme

Deniz'in tabletine veya cep telefonuna bu programı bir mobil uygulama gibi yüklemek için:

### 🍏 iPad ve iPhone (Safari):
1. Safari tarayıcısında uygulama linkini açın.
2. Alttaki / üstteki **"Paylaş"** (kare içinden yukarı ok çıkan) butonuna dokunun.
3. Menüden **"Ana Ekrana Ekle" (Add to Home Screen)** seçeneğini seçin.
4. Sağ üstteki **"Ekle"**ye basın. Uygulama ana ekrana logosuyla bir uygulama olarak gelir ve tam ekran çalışır.

### 🤖 Android Tablet ve Telefon (Chrome):
1. Chrome tarayıcısında linki açın.
2. Ekranın sağ üstündeki üç noktaya dokunun veya ekranda beliren **"Uygulamayı Yükle"** / **"Ana Ekrana Ekle"** butonuna basın.
3. Uygulama doğrudan telefonunuza bağımsız bir program olarak yüklenir.

---

## ☁️ 5. Google Apps Script Bulut ve E-posta Kurulumu (2 Dakika)

Uygulamanın bulut senkronizasyonunu, Cuma 21:00 raporlarını ve günlük ödev hatırlatmasını aktif etmek için:

1. [script.google.com](https://script.google.com) adresine gidin ve **"Yeni Proje"** oluşturun.
2. Klasördeki **`google-apps-script.js`** dosyasının **TÜM İÇERİĞİNİ** kopyalayıp editöre yapıştırın ve Kaydedin (`Ctrl+S`).
3. Sağ üstteki **"Dağıt" (Deploy) ➔ "Yeni Dağıtım" (New deployment)** seçin:
   - Tür: **Web Uygulaması (Web app)**
   - Yürüten: **Kendim (Me)**
   - Erişim: **Herkes (Anyone)**
   - **"Dağıt"** butonuna basın ve ilk yetkilendirme izinlerini onaylayın.
4. Verilen **Web Uygulaması URL'sini** kopyalayın.
5. Web uygulamasındaki **"Ayarlar"** sekmesini açıp bu URL'yi yapıştırın ve **"Ayarları Kaydet"**e basın.
6. Otomatik tetikleyicileri kurmak için:
   - İster web arayüzündeki **"Tetikleyicileri Otomatik Kur"** butonuna basın,
   - İster Google Apps Script editöründe `YETKILENDIRME_VE_TETIKLEYICILERI_KUR` fonksiyonunu seçip **"Çalıştır"**a basın.
   - Sistem **her Cuma 21:00** raporunu ve **her gün 17:00** hatırlatıcısını otomatik kurar!

---

## 📊 6. Deneme Sınavı Modülü

Uygulamada yer alan özel **"Deneme Sınavları"** sekmesi ile:
- Okulda, dershanede veya kurumlarda (Özdebir, TÖDER vb.) girilen tüm sınavlar kaydedilir.
- **9. Sınıf Dersleri:** Türk Dili ve Edebiyatı, Matematik, Fizik, Kimya, Biyoloji, Tarih, Coğrafya, Din/Felsefe, İngilizce.
- Her dersin Doğru, Yanlış, Boş sayıları girilir; sistem ÖSYM standardında (4 yanlış 1 doğruyu götürür) netleri canlı hesaplar.
- Çözülen denemelerin net gelişim grafiği (Chart.js) interaktif olarak görüntülenir.
- Cuma akşamı saat 21:00'de öğretmene giden haftalık raporda o hafta çözülen tüm denemelerin detayları yer alır.

---

## 📸 7. Çözülemeyen Soru Havuzu

Deniz takıldığı veya çözemediği soruları doğrudan tablet/telefon kamerasından çekip sisteme yükleyebilir. Sorular Google Drive'da açılan `"Deniz 9. Sınıf - Çözülemeyen Sorular"` klasörüne tarih ve ders notuyla otomatik yedeklenir.
