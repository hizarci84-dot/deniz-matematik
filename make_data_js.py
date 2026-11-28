# -*- coding: utf-8 -*-
"""
Generate data.js for Deniz 9. Sınıf Test & Etkinlik Programı
"""
import json

with open('deniz_schedule.json', 'r', encoding='utf-8') as f:
    schedule = json.load(f)

telafi_ranges = [
    {
        "id": "telafi-1",
        "start": "2026-11-29",
        "end": "2026-12-06",
        "title": "Telafi & Eksik Tamamlama Haftası",
        "subtitle": "29 Kasım – 6 Aralık 2026 (Yeni Ödev Yok)",
        "description": "Yetişmeyen veya yapamadığın önceki ödevleri tamamlamak için 1 haftalık özel telafi boşluğu oluşturuldu. Bu hafta yeni konu ödevi verilmeyecek; eksik kalan test ve etkinliklerini çözüp sisteme girebilir, yapamadığın soruların fotoğrafını Dijital Yanlış Defteri'ne yükleyebilirsin."
    }
]

# Structure books metadata
books_meta = [
    {
        "id": "matbook-9",
        "title": "MatBook 9. Sınıf Matematik Video Ders Kitabı (VDK)",
        "shortTitle": "MatBook VDK",
        "publisher": "MatBook Yayınları",
        "totalPages": 268,
        "type": "Video Destekli Konu & Etkinlik Kitabı",
        "badgeColor": "bg-indigo-600",
        "accentColor": "#6366f1",
        "description": "2026 Türkiye Yüzyılı Maarif Modeli uyumlu; konu anlatımları, 2 sayfalık kavrama etkinlikleri, Bilgi Temelli ve Beceri Temelli yeni nesil sorular.",
        "themesCount": 7,
        "testsCount": 47,
        "activitiesCount": 76
    },
    {
        "id": "orijinal-9",
        "title": "Orijinal 9. Sınıf Matematik Soru Bankası",
        "shortTitle": "Orijinal SB",
        "publisher": "Orijinal Yayınları",
        "totalPages": 337,
        "type": "Soru Bankası & Beceri Temelli Testler",
        "badgeColor": "bg-amber-600",
        "accentColor": "#d97706",
        "description": "2026 Maarif Modeli 9. Sınıf müfredatına tam uyumlu; Temel Kabul, Kazanım Kavrama, Süreç Kontrol ve Beceri Temelli derinleştirme testleri.",
        "themesCount": 7,
        "testsCount": 177,
        "activitiesCount": 0
    }
]

# Gamification Badges
badges = [
    {
        "id": "first_step",
        "icon": "fa-shoe-prints",
        "title": "İlk Adım",
        "desc": "Deniz programdaki ilk günlük ödevini tamamladı!",
        "req": "1 Görev",
        "xp": 50
    },
    {
        "id": "streak_3",
        "icon": "fa-fire",
        "title": "3 Günlük Seri",
        "desc": "Aralıksız 3 gün boyunca ödevlerini eksiksiz yaptı!",
        "req": "3 Gün Seri",
        "xp": 100
    },
    {
        "id": "streak_7",
        "icon": "fa-fire-flame-curved",
        "title": "Haftalık Şampiyon",
        "desc": "7 gün boyunca hiç aksatmadan seriyi korudu!",
        "req": "7 Gün Seri",
        "xp": 250
    },
    {
        "id": "first_activity",
        "icon": "fa-pen-to-square",
        "title": "Etkinlik Ustası",
        "desc": "İlk 2 sayfalık MatBook etkinliğini başarıyla bitirdi!",
        "req": "1 Etkinlik",
        "xp": 50
    },
    {
        "id": "first_deneme",
        "icon": "fa-award",
        "title": "İlk Deneme",
        "desc": "İlk genel veya branş deneme sınavının veri girişini yaptı!",
        "req": "1 Deneme",
        "xp": 150
    },
    {
        "id": "math_wizard",
        "icon": "fa-wand-magic-sparkles",
        "title": "Net Sihirbazı",
        "desc": "Bir testte veya denemede 10 ve üzeri nete ulaştı!",
        "req": "10+ Net",
        "xp": 200
    },
    {
        "id": "perfect_test",
        "icon": "fa-star",
        "title": "Tam İsabet",
        "desc": "Bir testi sıfır yanlış ve sıfır boşla kusursuz bitirdi!",
        "req": "%100 Doğru",
        "xp": 300
    },
    {
        "id": "theme_master",
        "icon": "fa-crown",
        "title": "1. Tema Fatihi",
        "desc": "1. Tema: Sayılar konusunun tüm görevlerini tamamladı!",
        "req": "1. Tema Bitişi",
        "xp": 500
    },
    {
        "id": "halfway_hero",
        "icon": "fa-medal",
        "title": "Zirveye Doğru",
        "desc": "Programın ilk 100 görevini geride bıraktı!",
        "req": "100 Görev",
        "xp": 750
    },
    {
        "id": "marathon_champion",
        "icon": "fa-trophy",
        "title": "9. Sınıf Şampiyonu",
        "desc": "Tüm müfredatı ve testleri eksiksiz tamamladı!",
        "req": "Tüm Program",
        "xp": 1500
    }
]

# Standard 9th Grade Subjects for Deneme Sınavı
deneme_subjects = [
    {"id": "turkce", "name": "Türk Dili ve Edebiyatı", "defaultQ": 30, "icon": "fa-book-open", "color": "text-rose-500"},
    {"id": "matematik", "name": "Matematik", "defaultQ": 30, "icon": "fa-calculator", "color": "text-blue-500"},
    {"id": "fizik", "name": "Fizik", "defaultQ": 10, "icon": "fa-atom", "color": "text-indigo-500"},
    {"id": "kimya", "name": "Kimya", "defaultQ": 10, "icon": "fa-flask", "color": "text-emerald-500"},
    {"id": "biyoloji", "name": "Biyoloji", "defaultQ": 10, "icon": "fa-dna", "color": "text-green-500"},
    {"id": "tarih", "name": "Tarih", "defaultQ": 10, "icon": "fa-landmark", "color": "text-amber-500"},
    {"id": "cografya", "name": "Coğrafya", "defaultQ": 10, "icon": "fa-earth-americas", "color": "text-teal-500"},
    {"id": "din_felsefe", "name": "Din Kültürü / Felsefe", "defaultQ": 5, "icon": "fa-moon", "color": "text-purple-500"},
    {"id": "ingilizce", "name": "İngilizce (Yabancı Dil)", "defaultQ": 10, "icon": "fa-globe", "color": "text-cyan-500"}
]

data_js_content = f"""/**
 * =========================================================================
 * DENİZ 9. SINIF MATEMATİK & DENEME TAKİP SİSTEMİ - STATİK VERİ HAVUZU
 * =========================================================================
 * Başlangıç Tarihi: 21 Ekim 2026 Çarşamba | Bitiş Tarihi: 1 Haziran 2027 Salı
 * Telafi Boşluğu: 29 Kasım 2026 - 6 Aralık 2026 (1 Hafta)
 * Toplam Görev: {len(schedule)} Görev
 * Kaynaklar: MatBook 9. Sınıf VDK & Orijinal 9. Sınıf Matematik Soru Bankası
 */

const DENIZ_SCHEDULE = {json.dumps(schedule, ensure_ascii=False, indent=2)};

const TELAFI_RANGES = {json.dumps(telafi_ranges, ensure_ascii=False, indent=2)};

const BOOKS_METADATA = {json.dumps(books_meta, ensure_ascii=False, indent=2)};

const BADGES_DATA = {json.dumps(badges, ensure_ascii=False, indent=2)};

const DENEME_SUBJECTS = {json.dumps(deneme_subjects, ensure_ascii=False, indent=2)};

if (typeof module !== 'undefined' && module.exports) {{
  module.exports = {{ DENIZ_SCHEDULE, TELAFI_RANGES, BOOKS_METADATA, BADGES_DATA, DENEME_SUBJECTS }};
}}
"""

with open('data.js', 'w', encoding='utf-8') as f:
    f.write(data_js_content)

print(f"data.js written successfully with {len(schedule)} tasks.")
