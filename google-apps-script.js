/**
 * =========================================================================
 * DENİZ 9. SINIF MATEMATİK & DENEME TAKİP PLATFORMU - BULUT & BİLDİRİM MOTORU
 * =========================================================================
 * Google Apps Script v1.0
 * 
 * BU MOTOR NELER YAPAR?
 * 1. 📧 Cuma 21:00 Haftalık Gelişim & Karne Raporu:
 *    Her Cuma akşamı saat 21:00'de otomatik olarak çalışır. Deniz'in o hafta
 *    çözdüğü testleri, yaptığı 2 sayfalık etkinlikleri, girdiği deneme sınavlarını,
 *    doğru/yanlış/net istatistiklerini hesaplar; öğretmene (hizarci84@gmail.com) ve
 *    velilere şık, renkli bir HTML e-posta raporu gönderir.
 * 
 * 2. 🔔 Günlük Ödev Hatırlatması (Her Gün 17:00 / 18:00):
 *    Otomatik zamanlayıcı her gün çalışır, Deniz'in bugünkü ödevini (1 test veya
 *    2 sayfa etkinlik) kontrol eder. Ödev henüz yapılmamışsa öğrenci ve veliye
 *    hatırlatma maili gönderir.
 * 
 * 3. ☁️ Kesintisiz Bulut Senkronizasyonu (Google Drive / Cloud Sync):
 *    Deniz tabletinden veya telefonundan veri girdiğinde anında senkronize olur.
 *    Veriler kaybolmaz, birden fazla cihazdan eşzamanlı takip edilir.
 * 
 * 4. 📸 Çözülemeyen Sorular Arşivi (Google Drive):
 *    Deniz'in yapamadığı sorular Google Drive'da "Deniz 9. Sınıf - Çözülemeyen Sorular"
 *    klasörüne yüksek kalitede arşivlenir ve öğretmen incelemesine sunulur.
 * 
 * -------------------------------------------------------------------------
 * KURULUM TALİMATLARI (2 DAKİKA):
 * 1. https://script.google.com adresine gidin ve "Yeni Proje" açın.
 * 2. Proje adını "Deniz 9. Sinif Takip Sistemi" yapın.
 * 3. Bu dosyadaki TÜM kodları kopyalayıp editöre yapıştırın ve Kaydedin (Ctrl+S).
 * 4. Sağ üstteki "Dağıt" (Deploy) -> "Yeni Dağıtım" (New deployment) seçin:
 *    - Tür: Web Uygulaması (Web app)
 *    - Yürüten: Kendim (Me)
 *    - Erişim: Herkes (Anyone)
 *    - "Dağıt" butonuna basın ve verilen Web Uygulaması URL'sini kopyalayın!
 * 5. Web uygulamasındaki "Ayarlar" sekmesine bu URL'yi yapıştırın.
 * 6. İlk yetkilendirme ve otomatik tetikleyiciler için:
 *    Üstteki menüden "YETKILENDIRME_VE_TETIKLEYICILERI_KUR" fonksiyonunu seçip "Çalıştır"a basın.
 * =========================================================================
 */

// Sistem Temel Yapılandırması
var CONFIG = {
  STUDENT_NAME: "Deniz",
  GRADE: "9. Sınıf",
  DEFAULT_TEACHER_EMAIL: "hizarci84@gmail.com",
  DEFAULT_PARENT_EMAILS: "", // İsteğe bağlı veli e-postaları (virgülle ayırarak yazılabilir)
  DRIVE_FOLDER_QUESTIONS: "Deniz 9. Sınıf - Çözülemeyen Sorular",
  DRIVE_FOLDER_BACKUPS: "Deniz 9. Sınıf - Bulut Veri Yedekleri",
  WEEKLY_REPORT_DAY: ScriptApp.WeekDay.FRIDAY, // Her Cuma
  WEEKLY_REPORT_HOUR: 21, // Saat 21:00
  DAILY_REMINDER_HOUR: 17, // Her gün saat 17:00
  TIMEZONE: "GMT+3"
};

// =========================================================================
// 🚀 TEK TIKLA YETKİLENDİRME VE TETİKLEYİCİ KURULUMU
// =========================================================================

/**
 * İlk kurulumda Google Apps Script editöründe bu fonksiyonu seçip "Çalıştır"a basınız.
 * Drive klasörlerini açar, e-posta izinlerini doğrular ve otomatik zamanlayıcıları kurar.
 */
function YETKILENDIRME_VE_TETIKLEYICILERI_KUR() {
  Logger.log("1/4 - Google Drive klasörleri oluşturuluyor / kontrol ediliyor...");
  var qFolder = getOrCreateFolder(CONFIG.DRIVE_FOLDER_QUESTIONS);
  var bFolder = getOrCreateFolder(CONFIG.DRIVE_FOLDER_BACKUPS);
  Logger.log("✅ Drive klasörleri hazır: " + qFolder.getName() + " | " + bFolder.getName());

  Logger.log("2/4 - E-posta alıcıları doğrulanıyor...");
  var recipients = getAllRecipients();
  Logger.log("✅ Bildirim alıcı listesi: " + recipients.join(", "));

  Logger.log("3/4 - Cuma 21:00 Haftalık Rapor Zamanlayıcısı kuruluyor...");
  setupFridayReportTrigger();

  Logger.log("4/4 - Günlük Ödev Hatırlatma Zamanlayıcısı (17:00) kuruluyor...");
  setupDailyReminderTrigger();

  Logger.log("🎉 TEBRİKLER! Tüm sistem ve tetikleyiciler başarıyla kuruldu.");
  return { status: "success", message: "Tüm tetikleyiciler ve klasörler başarıyla hazırlandı." };
}

// =========================================================================
// 🌐 REST API ENDPOINTS (doGet & doPost)
// =========================================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  
  if (action === 'ping') {
    return createJsonResponse({ status: 'success', message: 'Deniz 9. Sınıf Bulut Motoru Aktif!', timestamp: new Date().toISOString() });
  }
  
  if (action === 'loadProgress') {
    var data = loadProgressFromDrive();
    return createJsonResponse({ status: 'success', data: data });
  }

  if (action === 'testFridayReport') {
    var result = sendWeeklyFridayReport();
    return createJsonResponse(result);
  }

  if (action === 'testDailyReminder') {
    var result = sendDailyHomeworkReminder();
    return createJsonResponse(result);
  }

  return createJsonResponse({ status: 'error', message: 'Bilinmeyen işlem: ' + action });
}

function doPost(e) {
  try {
    var postData = {};
    if (e && e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    }
    
    var action = postData.action || '';
    
    if (action === 'saveProgress') {
      var saved = saveProgressToDrive(postData.data);
      return createJsonResponse({ status: 'success', message: 'İlerleme buluta kaydedildi', timestamp: new Date().toISOString() });
    }
    
    if (action === 'uploadQuestion') {
      var fileUrl = saveQuestionPhotoToDrive(postData.imageData, postData.fileName, postData.notes);
      return createJsonResponse({ status: 'success', fileUrl: fileUrl });
    }

    if (action === 'sendDailyReport') {
      // Deniz bir testi veya etkinliği bitirdiğinde opsiyonel anlık bildirim
      var sendRes = sendInstantTaskCompletedEmail(postData.task, postData.result);
      return createJsonResponse(sendRes);
    }

    if (action === 'sendFridayReportNow') {
      var res = sendWeeklyFridayReport();
      return createJsonResponse(res);
    }

    if (action === 'sendDailyReminderNow') {
      var res = sendDailyHomeworkReminder();
      return createJsonResponse(res);
    }

    if (action === 'setupTriggersNow') {
      var res = YETKILENDIRME_VE_TETIKLEYICILERI_KUR();
      return createJsonResponse(res);
    }

    return createJsonResponse({ status: 'error', message: 'Geçersiz action: ' + action });
  } catch (err) {
    Logger.log("doPost Error: " + err.toString());
    return createJsonResponse({ status: 'error', error: err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// =========================================================================
// ⏰ ZAMANLAYICI (TRIGGER) YÖNETİMİ
// =========================================================================

/**
 * Her Cuma saat 21:00'de çalışan tetikleyiciyi kurar.
 */
function setupFridayReportTrigger() {
  // Mevcut haftalık tetikleyicileri temizle
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'fridayWeeklyReportJob') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Yeni Cuma 21:00 tetikleyicisi ekle
  ScriptApp.newTrigger('fridayWeeklyReportJob')
    .timeBased()
    .onWeekDay(CONFIG.WEEKLY_REPORT_DAY)
    .atHour(CONFIG.WEEKLY_REPORT_HOUR)
    .inTimezone(CONFIG.TIMEZONE)
    .create();

  Logger.log("✅ Cuma 21:00 Haftalık Rapor Tetikleyicisi başarıyla kuruldu.");
}

/**
 * Her gün saat 17:00'de çalışan günlük ödev hatırlatıcısını kurar.
 */
function setupDailyReminderTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'dailyHomeworkReminderJob') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('dailyHomeworkReminderJob')
    .timeBased()
    .everyDays(1)
    .atHour(CONFIG.DAILY_REMINDER_HOUR)
    .inTimezone(CONFIG.TIMEZONE)
    .create();

  Logger.log("✅ Günlük Ödev Hatırlatma Tetikleyicisi (Saat 17:00) başarıyla kuruldu.");
}

// Tetikleyicilerin çağıracağı wrapper fonksiyonlar
function fridayWeeklyReportJob() {
  Logger.log("⏰ Cuma 21:00 tetikleyicisi tetiklendi!");
  sendWeeklyFridayReport();
}

function dailyHomeworkReminderJob() {
  Logger.log("⏰ Günlük hatırlatıcı tetiklendi!");
  sendDailyHomeworkReminder();
}

// =========================================================================
// 📧 1. CUMA AKŞAMI 21:00 HAFTALIK RAPOR MOTORU
// =========================================================================

function sendWeeklyFridayReport() {
  var progress = loadProgressFromDrive();
  var recipients = getAllRecipients(progress.settings);
  if (!recipients || recipients.length === 0) {
    return { status: "error", message: "Hiçbir alıcı e-posta adresi bulunamadı." };
  }

  var now = new Date();
  var sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  
  // Bu haftanın istatistiklerini hesapla
  var weeklyStats = calculateWeeklyStatistics(progress, sevenDaysAgo, now);
  
  var subject = "📊 [Haftalık Rapor - Cuma 21:00] Deniz 9. Sınıf Matematik & Deneme Gelişim Karnesi";
  var htmlBody = buildWeeklyEmailTemplate(weeklyStats, progress);

  MailApp.sendEmail({
    to: recipients.join(","),
    subject: subject,
    htmlBody: htmlBody
  });

  Logger.log("✅ Cuma 21:00 haftalık raporu gönderildi: " + recipients.join(", "));
  return { status: "success", recipients: recipients, stats: weeklyStats };
}

function calculateWeeklyStatistics(progress, startDate, endDate) {
  var testResults = progress.testResults || {};
  var completedTasks = progress.completedTasks || {};
  var denemeler = progress.denemeler || [];
  var questions = progress.questions || [];

  var stats = {
    totalTasksCompleted: 0,
    testsCompleted: 0,
    activitiesCompleted: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    totalWrong: 0,
    totalEmpty: 0,
    totalNet: 0,
    denemeCount: 0,
    recentDenemeler: [],
    recentActivities: [],
    unsolvedCount: 0,
    currentStreak: progress.streak || 0,
    currentXp: progress.xp || 0
  };

  // Tamamlanan testleri tara
  for (var taskId in testResults) {
    var res = testResults[taskId];
    var taskDate = res.timestamp ? new Date(res.timestamp) : null;
    
    // Eğer son 7 gün içindeyse veya tarih bulunamıyorsa say
    var isThisWeek = taskDate ? (taskDate >= startDate && taskDate <= endDate) : true;
    if (isThisWeek) {
      stats.totalTasksCompleted++;
      if (res.isActivity) {
        stats.activitiesCompleted++;
        stats.recentActivities.push(res);
      } else {
        stats.testsCompleted++;
        stats.totalQuestions += (res.totalQ || 0);
        stats.totalCorrect += (res.correct || 0);
        stats.totalWrong += (res.wrong || 0);
        stats.totalEmpty += (res.empty || 0);
        stats.totalNet += (res.net || 0);
      }
    }
  }

  // Bu hafta girilen deneme sınavları
  for (var i = 0; i < denemeler.length; i++) {
    var d = denemeler[i];
    var dDate = d.date ? new Date(d.date) : null;
    if (dDate && dDate >= startDate && dDate <= endDate) {
      stats.denemeCount++;
      stats.recentDenemeler.push(d);
    }
  }

  // Bu hafta eklenen çözülemeyen sorular
  for (var j = 0; j < questions.length; j++) {
    var q = questions[j];
    var qDate = q.date ? new Date(q.date) : null;
    if (qDate && qDate >= startDate && qDate <= endDate && !q.solved) {
      stats.unsolvedCount++;
    }
  }

  stats.successPct = stats.totalQuestions > 0 ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100) : 0;
  stats.totalNet = Math.round(stats.totalNet * 100) / 100;

  return stats;
}

function buildWeeklyEmailTemplate(stats, progress) {
  var dateStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd MMMM yyyy, EEEE");
  
  var denemeHtml = "";
  if (stats.recentDenemeler.length > 0) {
    denemeHtml = "<div style='margin-top:20px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px;'>" +
      "<h3 style='margin:0 0 12px 0; color:#1e293b; font-size:16px;'>🎯 Bu Hafta Çözülen Deneme Sınavları (" + stats.recentDenemeler.length + ")</h3>" +
      "<table style='width:100%; border-collapse:collapse; font-size:14px;'>";
    for (var i = 0; i < stats.recentDenemeler.length; i++) {
      var d = stats.recentDenemeler[i];
      var qInfo = (d.totalQ ? d.totalQ + " Soru • " : "") + (d.totalD || 0) + "D " + (d.totalY || 0) + "Y " + (d.totalB || 0) + "B";
      denemeHtml += "<tr style='border-bottom:1px solid #e2e8f0;'>" +
        "<td style='padding:8px 0; font-weight:600; color:#0f172a;'>" + (d.name || "Deneme Sınavı") + " (" + (d.date || "") + ")<div style='font-size:12px; color:#64748b; font-weight:normal;'>" + qInfo + "</div></td>" +
        "<td style='padding:8px 0; text-align:right; color:#2563eb; font-weight:700;'>" + (d.totalNet || 0) + " Net</td>" +
        "</tr>";
    }
    denemeHtml += "</table></div>";
  }

  return "<div style='font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif; max-width:650px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;'>" +
    "<div style='background:linear-gradient(135deg, #1e3a8a, #3b82f6); padding:28px 24px; color:#ffffff;'>" +
      "<span style='background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:20px; font-size:12px; font-weight:600; text-transform:uppercase;'>Haftalık Resmi Rapor</span>" +
      "<h1 style='margin:12px 0 4px 0; font-size:24px; font-weight:800;'>Deniz — 9. Sınıf Matematik & Deneme Karnesi</h1>" +
      "<p style='margin:0; opacity:0.9; font-size:14px;'>" + dateStr + " • Saat 21:00 Raporu</p>" +
    "</div>" +

    "<div style='padding:24px;'>" +
      "<div style='display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:24px;'>" +
        "<div style='background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:16px; text-align:center;'>" +
          "<div style='font-size:12px; color:#1e40af; font-weight:600;'>TAMAMLANAN GÖREV</div>" +
          "<div style='font-size:26px; font-weight:800; color:#1e3a8a; margin-top:4px;'>" + stats.totalTasksCompleted + "</div>" +
          "<div style='font-size:11px; color:#3b82f6;'>" + stats.testsCompleted + " Test / " + stats.activitiesCompleted + " Etkinlik</div>" +
        "</div>" +
        "<div style='background:#ecfdf5; border:1px solid #a7f3d0; border-radius:12px; padding:16px; text-align:center;'>" +
          "<div style='font-size:12px; color:#065f46; font-weight:600;'>HAFTALIK NET</div>" +
          "<div style='font-size:26px; font-weight:800; color:#047857; margin-top:4px;'>" + stats.totalNet + "</div>" +
          "<div style='font-size:11px; color:#059669;'>Başarı: %" + stats.successPct + "</div>" +
        "</div>" +
        "<div style='background:#fef3c7; border:1px solid #fde68a; border-radius:12px; padding:16px; text-align:center;'>" +
          "<div style='font-size:12px; color:#92400e; font-weight:600;'>ÇALIŞMA SERİSİ</div>" +
          "<div style='font-size:26px; font-weight:800; color:#b45309; margin-top:4px;'>🔥 " + stats.currentStreak + " Gün</div>" +
          "<div style='font-size:11px; color:#d97706;'>Toplam XP: " + stats.currentXp + "</div>" +
        "</div>" +
      "</div>" +

      "<div style='background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:18px; margin-bottom:20px;'>" +
        "<h3 style='margin:0 0 12px 0; color:#0f172a; font-size:15px; font-weight:700;'>📝 Soru & Başarı Dağılımı</h3>" +
        "<div style='font-size:14px; color:#334155; line-height:1.8;'>" +
          "• <b>Toplam Çözülen Soru:</b> " + stats.totalQuestions + " soru<br/>" +
          "• <b>Doğru Sayısı:</b> <span style='color:#16a34a; font-weight:700;'>" + stats.totalCorrect + " Doğru</span><br/>" +
          "• <b>Yanlış Sayısı:</b> <span style='color:#dc2626; font-weight:700;'>" + stats.totalWrong + " Yanlış</span><br/>" +
          "• <b>Boş Sayısı:</b> <span style='color:#64748b; font-weight:700;'>" + stats.totalEmpty + " Boş</span><br/>" +
          "• <b>Net Ortalaması:</b> <span style='color:#2563eb; font-weight:700;'>" + stats.totalNet + " Net</span>" +
        "</div>" +
      "</div>" +

      denemeHtml +

      "<div style='margin-top:24px; padding:16px; background:#f1f5f9; border-radius:12px; font-size:13px; color:#475569; text-align:center;'>" +
        "📌 Bu rapor <b>Müfit Hoca ile Matematik Özel Takip Sistemi</b> tarafından her Cuma saat 21:00'de otomatik olarak oluşturulmaktadır.<br/>" +
        "Deniz'in gelişimini günlük takip etmek için tablet veya telefonundaki uygulamayı inceleyebilirsiniz." +
      "</div>" +
    "</div>" +
  "</div>";
}

// =========================================================================
// 🔔 2. GÜNLÜK ÖDEV HATIRLATMASI (HER GÜN 17:00 / 18:00)
// =========================================================================

function sendDailyHomeworkReminder() {
  var progress = loadProgressFromDrive();
  var recipients = getAllRecipients(progress.settings);
  if (!recipients || recipients.length === 0) {
    return { status: "error", message: "Alıcı e-posta adresi bulunamadı." };
  }

  var todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd");
  var schedule = progress.schedule || [];
  
  // Bugünkü görevleri topla (Hafta sonları 2 görev olabilir)
  var todayTasks = [];
  for (var i = 0; i < schedule.length; i++) {
    if (schedule[i].date === todayStr) {
      todayTasks.push(schedule[i]);
    }
  }

  // Eğer takvimde bugün yoksa sıradaki bekleyen görevleri bul
  if (todayTasks.length === 0 && schedule.length > 0) {
    var completed = progress.completedTasks || {};
    for (var j = 0; j < schedule.length; j++) {
      if (!completed[schedule[j].id]) {
        todayTasks.push(schedule[j]);
        if (todayTasks.length >= 2) break;
      }
    }
  }

  if (todayTasks.length === 0) {
    Logger.log("Bugün için ödev bulunamadı veya tüm ödevler tamamlanmış.");
    return { status: "info", message: "Bugün için bekleyen ödev yok." };
  }

  // Henüz tamamlanmamış görevleri filtrele
  var pendingTasks = [];
  var completedMap = progress.completedTasks || {};
  for (var k = 0; k < todayTasks.length; k++) {
    if (!completedMap[todayTasks[k].id]) {
      pendingTasks.push(todayTasks[k]);
    }
  }

  if (pendingTasks.length === 0) {
    Logger.log("✅ Deniz bugünkü tüm ödevlerini zaten tamamlamış. Hatırlatma gönderilmedi.");
    return { status: "already_completed", message: "Bugünkü tüm ödevler tamamlanmış." };
  }

  var subject = pendingTasks.length > 1
    ? "🔔 [Ödev Hatırlatması] Deniz'in Bugünkü Hafta Sonu Görevleri (" + pendingTasks.length + " Görev)"
    : "🔔 [Ödev Hatırlatması] Deniz'in Bugünkü Matematik Görevi: " + pendingTasks[0].title;
    
  var htmlBody = buildDailyReminderEmailTemplate(pendingTasks);

  MailApp.sendEmail({
    to: recipients.join(","),
    subject: subject,
    htmlBody: htmlBody
  });

  Logger.log("✅ Günlük hatırlatma e-postası gönderildi: " + recipients.join(", "));
  return { status: "success", pendingTasks: pendingTasks, recipients: recipients };
}

function buildDailyReminderEmailTemplate(tasks) {
  var dateStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "dd MMMM yyyy, EEEE");
  var taskList = Array.isArray(tasks) ? tasks : [tasks];

  var tasksHtml = "";
  for (var i = 0; i < taskList.length; i++) {
    var task = taskList[i];
    var isActivity = (task.type === 'etkinlik');
    var badgeText = isActivity ? "📖 2 Sayfa Etkinlik" : "📝 1 Adet Test";
    var badgeBg = isActivity ? "#4f46e5" : "#d97706";

    tasksHtml += "<div style='background:#f8fafc; border-left:4px solid " + badgeBg + "; border-radius:8px; padding:16px; margin-bottom:14px;'>" +
      "<div style='display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;'>" +
        "<span style='background:" + badgeBg + "; color:#ffffff; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:700;'>" + badgeText + "</span>" +
        "<span style='font-size:12px; color:#64748b; font-weight:600;'>" + (task.book || "9. Sınıf Matematik") + "</span>" +
      "</div>" +
      "<div style='font-size:16px; font-weight:800; color:#0f172a; margin:4px 0;'>" + task.title + "</div>" +
      "<div style='font-size:13px; color:#334155;'><b>Konu:</b> " + (task.theme || "") + " • " + (task.subtopic || "") + "</div>" +
      "<div style='font-size:13px; color:#334155; margin-top:2px;'><b>Sayfa:</b> " + (task.pages || "") + (task.q_count ? " (" + task.q_count + " Soru)" : "") + "</div>" +
    "</div>";
  }

  return "<div style='font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,sans-serif; max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;'>" +
    "<div style='background:linear-gradient(135deg, #0f172a, #1e293b); padding:24px; color:#ffffff;'>" +
      "<span style='background:#2563eb; color:#ffffff; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:700;'>GÜNLÜK TAKİP</span>" +
      "<h2 style='margin:12px 0 4px 0; font-size:22px; font-weight:800;'>🔔 Deniz'in Bugünkü Ödevi</h2>" +
      "<p style='margin:0; opacity:0.8; font-size:14px;'>" + dateStr + " • 1 Haziran Bitiş Hedefi</p>" +
    "</div>" +

    "<div style='padding:24px;'>" +
      tasksHtml +

      "<div style='text-align:center; margin:24px 0 16px 0;'>" +
        "<div style='display:inline-block; background:#2563eb; color:#ffffff; padding:12px 28px; border-radius:10px; font-weight:700; font-size:14px; text-decoration:none;'>" +
          "📱 Deniz Test Takip Uygulamasını Aç ve Sonuç Gir" +
        "</div>" +
      "</div>" +

      "<div style='font-size:12px; color:#94a3b8; text-align:center; border-top:1px solid #f1f5f9; padding-top:16px;'>" +
        "Müfit Hoca Özel Takip Sistemi • Günlük Ödev Hatırlatma Servisi" +
      "</div>" +
    "</div>" +
  "</div>";
}

// =========================================================================
// 📩 3. ANLIK GÖREV TAMAMLAMA BİLDİRİMİ (OPSİYONEL)
// =========================================================================

function sendInstantTaskCompletedEmail(task, result) {
  var recipients = getAllRecipients();
  if (!recipients || recipients.length === 0 || !task) {
    return { status: "skipped" };
  }

  var isActivity = (task.type === 'etkinlik');
  var subject = isActivity 
    ? "✅ [Ödev Tamamlandı] Deniz: " + task.title + " (" + task.pages + ")"
    : "🎯 [Test Çözüldü] Deniz: " + task.title + " — " + (result.net || 0) + " Net";

  var body = "<div style='font-family:sans-serif; max-width:550px; margin:0 auto; padding:20px; border:1px solid #e2e8f0; border-radius:12px;'>" +
    "<h3 style='color:#0f172a; margin-top:0;'>Deniz Yeni Bir Görevi Tamamladı! 🎉</h3>" +
    "<p><b>Kitap:</b> " + task.book + "<br/>" +
    "<b>Görev:</b> " + task.title + "<br/>" +
    "<b>Sayfalar:</b> " + task.pages + "</p>";

  if (!isActivity && result) {
    body += "<div style='background:#f1f5f9; padding:12px; border-radius:8px; font-size:14px;'>" +
      "<b>Doğru:</b> " + (result.correct || 0) + " | " +
      "<b>Yanlış:</b> " + (result.wrong || 0) + " | " +
      "<b>Boş:</b> " + (result.empty || 0) + " | " +
      "<b>Net:</b> <span style='color:#2563eb; font-weight:700;'>" + (result.net || 0) + " Net</span>" +
    "</div>";
  }

  body += "<p style='font-size:12px; color:#64748b; margin-top:16px;'>Müfit Hoca Özel Takip Sistemi</p></div>";

  MailApp.sendEmail({
    to: recipients.join(","),
    subject: subject,
    htmlBody: body
  });

  return { status: "success" };
}

// =========================================================================
// ☁️ 4. BULUT DEPOLAMA & GOOGLE DRIVE YÖNETİMİ
// =========================================================================

function saveProgressToDrive(progressData) {
  var folder = getOrCreateFolder(CONFIG.DRIVE_FOLDER_BACKUPS);
  var fileName = "deniz_progress_latest.json";
  
  var files = folder.getFilesByName(fileName);
  var file;
  if (files.hasNext()) {
    file = files.next();
    file.setContent(JSON.stringify(progressData, null, 2));
  } else {
    file = folder.createFile(fileName, JSON.stringify(progressData, null, 2), MimeType.PLAIN_TEXT);
  }
  
  // Ayrıca ScriptProperties'e hızlı erişim için özet yaz
  var props = PropertiesService.getScriptProperties();
  props.setProperty('LAST_SYNC_TIME', new Date().toISOString());
  if (progressData.settings) {
    props.setProperty('SETTINGS_CACHE', JSON.stringify(progressData.settings));
  }
  
  return file.getUrl();
}

function loadProgressFromDrive() {
  var folder = getOrCreateFolder(CONFIG.DRIVE_FOLDER_BACKUPS);
  var files = folder.getFilesByName("deniz_progress_latest.json");
  if (files.hasNext()) {
    var file = files.next();
    var content = file.getBlob().getDataAsString();
    try {
      return JSON.parse(content);
    } catch(e) {
      Logger.log("JSON Parse Hatası: " + e);
    }
  }
  return {};
}

function saveQuestionPhotoToDrive(base64Data, fileName, notes) {
  if (!base64Data) return null;
  var folder = getOrCreateFolder(CONFIG.DRIVE_FOLDER_QUESTIONS);
  
  // Format base64
  var cleanBase64 = base64Data;
  var contentType = MimeType.JPEG;
  if (base64Data.indexOf("data:") === 0) {
    var parts = base64Data.split(",");
    var mimePart = parts[0].split(";")[0].replace("data:", "");
    if (mimePart) contentType = mimePart;
    cleanBase64 = parts[1];
  }
  
  var decoded = Utilities.base64Decode(cleanBase64);
  var name = fileName || ("Soru_" + Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyyMMdd_HHmmss") + ".jpg");
  var blob = Utilities.newBlob(decoded, contentType, name);
  var file = folder.createFile(blob);
  if (notes) {
    file.setDescription(notes);
  }
  return file.getUrl();
}

function getAllRecipients(customSettings) {
  var list = [];
  
  // 1. Öğretmen e-postası
  var teacher = (customSettings && customSettings.teacherEmail) || CONFIG.DEFAULT_TEACHER_EMAIL;
  if (teacher && teacher.trim()) {
    list.push(teacher.trim());
  }
  
  // 2. Veli e-postaları
  var parents = (customSettings && customSettings.parentEmails) || CONFIG.DEFAULT_PARENT_EMAILS;
  if (parents && parents.trim()) {
    var split = parents.split(",");
    for (var i = 0; i < split.length; i++) {
      var em = split[i].trim();
      if (em && list.indexOf(em) === -1) {
        list.push(em);
      }
    }
  }

  // 3. Script Properties cache kontrol
  if (list.length === 0) {
    var props = PropertiesService.getScriptProperties();
    var cached = props.getProperty('SETTINGS_CACHE');
    if (cached) {
      try {
        var obj = JSON.parse(cached);
        if (obj.teacherEmail) list.push(obj.teacherEmail.trim());
        if (obj.parentEmails) {
          var pSplit = obj.parentEmails.split(",");
          for (var k = 0; k < pSplit.length; k++) {
            var pem = pSplit[k].trim();
            if (pem && list.indexOf(pem) === -1) list.push(pem);
          }
        }
      } catch(e) {}
    }
  }

  if (list.length === 0) {
    list.push(CONFIG.DEFAULT_TEACHER_EMAIL);
  }

  return list;
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}
