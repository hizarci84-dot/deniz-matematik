/**
 * =========================================================================
 * DENİZ 9. SINIF MATEMATİK & DENEME TAKİP PLATFORMU - APP ENGINE (v2.0)
 * =========================================================================
 * Başlangıç: 21 Ekim 2026 Çarşamba | Bitiş: 1 Haziran 2027 Salı
 * Dağılım: Hafta İçi Günlük 1 Görev, Hafta Sonu Günlük 2 Görev
 */

const STORAGE_KEY = 'deniz_9_sinif_progress_v1';

// Global early capture of PWA beforeinstallprompt (so it is NEVER missed)
let globalDeferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  globalDeferredInstallPrompt = e;
  console.log('[PWA] Early beforeinstallprompt captured successfully!');
  if (window.appEngine) {
    window.appEngine.onInstallReady();
  }
});

class DenizAppEngine {
  constructor() {
    this.schedule = DENIZ_SCHEDULE || [];
    this.books = BOOKS_METADATA || [];
    this.badges = BADGES_DATA || [];
    this.denemeSubjects = DENEME_SUBJECTS || [];

    // State
    this.state = {
      currentDateStr: '2026-10-21',
      activeTab: 'today',
      completedTasks: {},
      testResults: {},
      denemeler: [],
      questions: [],
      cloudSettings: {
        scriptUrl: 'https://script.google.com/macros/s/AKfycbz6aSJ1SLUgo3PdGw7ZI-1_7WqONAGH4h3l40IjP_fSWiTH5CongTM5KqNaJ2WXCcOusg/exec',
        teacherEmail: 'hizarci84@gmail.com',
        parentEmails: 'fatmagirisken@hotmail.com, ferudunnew@gmail.com, deniz.girisken@icloud.com'
      },
      streak: 0,
      xp: 0,
      lastStreakDate: null,
      darkMode: false
    };

    this.activeModalTaskId = null;
    this.deferredInstallPrompt = null;
    this.denemeChartInstance = null;
    this.denemeRadarChartInstance = null;
    this.denemeActiveFilter = 'all';
    this.denemeRadarMode = 'radar';
    this.currentUploadImageBase64 = null;
    this.rawQuestionImageBase64 = null;
    this.quoteOffset = 0;
    this.motivationQuotes = [];
    this.liveCameraStream = null;
    this.currentFacingMode = 'environment';
    this.qFilter = 'all';
    this.selectedThemeFilter = 'all';
    this.isSettingsUnlocked = false;
    this.SETTINGS_PASSWORD = '2026';
  }

  init() {
    this.loadState();
    this.initCurrentDate();
    this.applyTheme();
    this.setupPwa();
    this.renderAllViews();
    this.setupAutoSync();
    console.log("Deniz 9. Sınıf App Engine (1 Haziran Bitişli) initialized successfully.");
  }

  // -------------------------------------------------------------------------
  // STORAGE & STATE
  // -------------------------------------------------------------------------
  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = { ...this.state, ...parsed };
      }
      if (this.state.activeTab === 'settings') {
        this.state.activeTab = 'today';
      }
      if (!this.state.cloudSettings) {
        this.state.cloudSettings = {};
      }
      if (!this.state.cloudSettings.parentEmails || !this.state.cloudSettings.parentEmails.includes('deniz.girisken@icloud.com')) {
        this.state.cloudSettings.parentEmails = 'fatmagirisken@hotmail.com, ferudunnew@gmail.com, deniz.girisken@icloud.com';
      }
      if (!this.state.cloudSettings.teacherEmail) {
        this.state.cloudSettings.teacherEmail = 'hizarci84@gmail.com';
      }
    } catch (e) {
      console.error("Local storage load error:", e);
    }
  }

  saveState(skipCloud = false) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.updateHeaderStats();
      if (!skipCloud && this.state.cloudSettings.scriptUrl) {
        this.debouncedCloudSync();
      }
    } catch (e) {
      console.error("Local storage save error:", e);
    }
  }

  initCurrentDate() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const realTodayStr = `${yyyy}-${mm}-${dd}`;

    const match = this.schedule.find(s => s.date === realTodayStr);
    if (match) {
      this.state.currentDateStr = realTodayStr;
    } else {
      this.state.currentDateStr = '2026-10-21';
    }
  }

  // -------------------------------------------------------------------------
  // NAVIGATION & TABS
  // -------------------------------------------------------------------------
  switchTab(tabId) {
    if (tabId === 'settings' && !this.isSettingsUnlocked) {
      this.openSettingsPasswordModal();
      return;
    }

    this.state.activeTab = tabId;
    
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab-btn') === tabId;
      btn.className = isTarget
        ? 'nav-tab-btn px-4 py-2.5 text-sm font-semibold border-b-2 border-brand-600 text-brand-600 dark:text-brand-400 flex items-center space-x-2'
        : 'nav-tab-btn px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center space-x-2';
    });

    document.querySelectorAll('.mob-tab-btn').forEach(btn => {
      const isTarget = btn.getAttribute('data-mob-tab') === tabId;
      btn.className = isTarget
        ? 'mob-tab-btn flex flex-col items-center justify-center text-brand-600 dark:text-brand-400 font-extrabold transition-all active:scale-90'
        : 'mob-tab-btn flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold transition-all active:scale-90';
    });

    if (tabId === 'schedule') {
      this.renderScheduleView();
    } else if (tabId === 'denemeler') {
      this.renderDenemelerView();
    } else if (tabId === 'books') {
      this.renderBooksView();
    } else if (tabId === 'questions') {
      this.renderQuestionsView();
    } else if (tabId === 'badges') {
      this.renderBadgesView();
    } else if (tabId === 'settings') {
      this.renderSettingsView();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navigateDay(delta) {
    const uniqueDates = [...new Set(this.schedule.map(s => s.date))];
    const currentIndex = uniqueDates.indexOf(this.state.currentDateStr);
    
    if (delta === 0) {
      this.initCurrentDate();
    } else if (currentIndex !== -1) {
      const newIndex = Math.max(0, Math.min(uniqueDates.length - 1, currentIndex + delta));
      this.state.currentDateStr = uniqueDates[newIndex];
    }
    this.renderTodayView();
  }

  // -------------------------------------------------------------------------
  // RENDER VIEWS
  // -------------------------------------------------------------------------
  renderAllViews() {
    this.updateHeaderStats();
    this.renderMotivationQuote();
    this.renderTodayView();
    this.renderScheduleThemePills();
    this.renderScheduleView();
    this.renderDenemeSubjectInputs();
    this.renderDenemelerView();
    this.renderBooksView();
    this.renderQuestionsView();
    this.renderBadgesView();
    this.renderSettingsView();
  }

  updateHeaderStats() {
    const streakEl = document.getElementById('streak-counter');
    if (streakEl) streakEl.textContent = `${this.state.streak || 0} Gün`;

    const xpEl = document.getElementById('xp-counter');
    if (xpEl) xpEl.textContent = `${this.state.xp || 0} XP`;

    const totalCompleted = Object.keys(this.state.completedTasks || {}).length;
    const statTotalTasks = document.getElementById('stat-total-tasks');
    if (statTotalTasks) statTotalTasks.textContent = `${totalCompleted} / ${this.schedule.length}`;

    const statPct = document.getElementById('stat-task-pct');
    if (statPct) {
      const pct = Math.round((totalCompleted / (this.schedule.length || 1)) * 100);
      statPct.textContent = `%${pct} Tamamlandı`;
    }

    let totalQ = 0;
    let totalNet = 0;
    let testCount = 0;
    let actCount = 0;

    for (const id in this.state.testResults) {
      const res = this.state.testResults[id];
      if (res.isActivity) {
        actCount++;
      } else {
        testCount++;
        totalQ += (res.totalQ || 0);
        totalNet += (res.net || 0);
      }
    }

    const statQ = document.getElementById('stat-total-questions');
    if (statQ) statQ.textContent = totalQ;

    const statNetAvg = document.getElementById('stat-net-avg');
    if (statNetAvg) {
      const avg = testCount > 0 ? (totalNet / testCount).toFixed(2) : '0.00';
      statNetAvg.textContent = `${avg} Net Ortalaması`;
    }

    const statAct = document.getElementById('stat-total-activities');
    if (statAct) statAct.textContent = actCount;

    const statDeneme = document.getElementById('stat-total-deneme');
    if (statDeneme) statDeneme.textContent = (this.state.denemeler || []).length;
  }

  // -------------------------------------------------------------------------
  // GÜNLÜK MATEMATİK & MOTİVASYON SÖZLERİ
  // -------------------------------------------------------------------------
  initMotivationQuotes() {
    this.motivationQuotes = [
      {
        quote: "Matematik de resim, müzik ve heykel gibi bir sanattır. Matematik esas olarak sabır olayıdır. Ezberleyerek değil, keşfederek anlamak gerekir.",
        author: "Ord. Prof. Dr. Cahit Arf"
      },
      {
        quote: "Matematik bilimlerin kraliçesidir, aritmetik de matematiğin kraliçesidir.",
        author: "Carl Friedrich Gauss"
      },
      {
        quote: "Deniz, 9. sınıf temellerin en sağlam atıldığı yıldır. Günlük sadece 1 test veya 2 sayfa etkinlik yaparak yıl sonunda tüm müfredatı eksiksiz bitirmiş olacaksın!",
        author: "Müfit Hoca'dan Tavsiye"
      },
      {
        quote: "Soruyu çözememek ayıp değil, düşünmeyi bırakmak kayıptır. Her zor soru zihni bir adım daha büyütür ve güçlendirir.",
        author: "Prof. Dr. Ali Nesin"
      },
      {
        quote: "Saf matematik, kendi tarzında mantıksal fikirlerin şiiridir.",
        author: "Albert Einstein"
      },
      {
        quote: "Yanlış çözdüğün ve boş bıraktığın her soru, sınavda doğru yapacağın yeni bir bilginin müjdecisidir. Sorulardan korkma, üzerine git!",
        author: "Müfit Hoca'dan Tavsiye"
      },
      {
        quote: "Evrenin büyük kitabı ancak onun yazıldığı dili, yani matematiği öğrenenler tarafından okunabilir.",
        author: "Galileo Galilei"
      },
      {
        quote: "Şüphe etmek düşünmektir, düşünmek ise var olmaktır. Doğru adımlarla çözülemeyecek hiçbir matematik problemi yoktur.",
        author: "René Descartes"
      },
      {
        quote: "Matematik, farklı şeylere aynı adı verme sanatıdır.",
        author: "Henri Poincaré"
      },
      {
        quote: "Matematik güzelliğini yalnızca sabredenlere, merak edenlere ve çaba gösterenlere açar.",
        author: "Maryam Mirzakhani (İlk Kadın Fields Madalyası Sahibi)"
      },
      {
        quote: "Geometriye giden hiçbir kral yolu yoktur; emek, merak ve istikrarla adım adım inşa edilir.",
        author: "Öklid (Euclid)"
      },
      {
        quote: "Benim için bir formül, derin bir mantıksal fikri veya evrensel ahengi ifade etmedikçe hiçbir anlam taşımaz.",
        author: "Srinivasa Ramanujan"
      },
      {
        quote: "Bizi bekleyen problemler vardır. Bilmeliyiz ve bileceğiz!",
        author: "David Hilbert"
      },
      {
        quote: "Zor sorular, senin yeteneğini sınırlamak için değil; ne kadar azimli ve güçlü bir öğrenci olduğunu göstermek için vardır.",
        author: "Müfit Hoca'dan Tavsiye"
      },
      {
        quote: "İnsanlar matematiğin zor olduğunu düşünüyorsa, hayatın ne kadar karmaşık olduğunu henüz fark etmemişlerdir.",
        author: "John von Neumann"
      },
      {
        quote: "Ruhunda şairlik olmayan biri hiçbir zaman tam ve derin bir matematikçi olamaz.",
        author: "Sofia Kovalevskaya"
      },
      {
        quote: "Başarı, her gün tekrarlanan küçük disiplinlerin toplamıdır. Bir soruyu daha anlamak, yarının başarısını garantiler.",
        author: "Robert Collier"
      },
      {
        quote: "Matematikçinin desenleri ressamın veya şairin desenleri gibi güzel olmalıdır; fikirler renkler gibi uyum içinde parlamalıdır.",
        author: "G. H. Hardy"
      },
      {
        quote: "Evrenin temeli sayılardır; düzen, ahenk ve disiplin sayılarla konuşur.",
        author: "Pisagor (Pythagoras)"
      },
      {
        quote: "Deniz, yapamadığın soruyu dijital deftere kaydedip incelemek, konuyu en derin şekilde öğrenmenin ve netleri artırmanın sırrıdır.",
        author: "Müfit Hoca'dan Tavsiye"
      },
      {
        quote: "Mantığımız sağlam ve adımlarımız düzenli olduğu sürece zihnimizin aşamayacağı hiçbir teorem yoktur.",
        author: "Emmy Noether"
      },
      {
        quote: "Matematik doğru bakıldığında sadece hakikati değil, yüce bir güzelliği ve düzeni de barındırır.",
        author: "Bertrand Russell"
      },
      {
        quote: "Bir problemi çözmenin en iyi yolu, onu adım adım daha küçük ve yönetilebilir parçalara ayırmaktır.",
        author: "George Pólya (Problem Çözme Sanatı)"
      },
      {
        quote: "Büyük başarılar birdenbire gerçekleşmez; her gün atılan kararlı ve küçük adımlarla inşa edilir.",
        author: "Vincent van Gogh"
      },
      {
        quote: "Akıl bir meşale gibidir; matematik ise bu meşaleyi en parlak şekilde tutuşturan kıvılcımdır.",
        author: "Leonhard Euler"
      },
      {
        quote: "Bugünün emeği, yarının özgüvenidir. Bir testi tamamladığında sadece soru çözmüş olmazsın, iradeni de güçlendirirsin.",
        author: "Müfit Hoca'dan Tavsiye"
      },
      {
        quote: "Doğa, matematik dilinde yazılmış kusursuz bir senfonidir.",
        author: "Johannes Kepler"
      },
      {
        quote: "Hiçbir araştırma matematiksel ispattan ve mantıksal testten geçmedikçe gerçek bilim sayılamaz.",
        author: "Leonardo da Vinci"
      },
      {
        quote: "Her matematiksel buluş bir merak kıvılcımıyla başlar, mantık süzgecinden geçerek kanıta dönüşür.",
        author: "Felix Klein"
      },
      {
        quote: "En büyük zafer, pes etmemeyi öğrenmektir. Çözülmeyen soru yoktur, henüz keşfedilmemiş yöntem vardır.",
        author: "Müfit Hoca'dan Tavsiye"
      }
    ];
  }

  renderMotivationQuote() {
    const textEl = document.getElementById('daily-quote-text');
    const authorEl = document.getElementById('daily-quote-author');
    const badgeEl = document.getElementById('daily-quote-date-badge');
    if (!textEl || !authorEl) return;

    if (!this.motivationQuotes || this.motivationQuotes.length === 0) {
      this.initMotivationQuotes();
    }

    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    const offset = this.quoteOffset || 0;
    const count = this.motivationQuotes.length;
    const index = (((dayOfYear + offset) % count) + count) % count;
    const current = this.motivationQuotes[index];

    textEl.textContent = `"${current.quote}"`;
    authorEl.textContent = current.author;

    if (badgeEl) {
      const dateStr = today.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' });
      badgeEl.textContent = dateStr;
    }
  }

  nextMotivationQuote() {
    if (!this.quoteOffset) this.quoteOffset = 0;
    this.quoteOffset++;
    this.renderMotivationQuote();
    this.showToast('Yeni ilham verici söz yüklendi 💡', 'fa-lightbulb', 'text-amber-500');
  }

  // TAB 1: TODAY (Handles weekdays with 1 task and weekends with 2 tasks)
  renderTodayView() {
    const currentTasks = this.schedule.filter(s => s.date === this.state.currentDateStr);
    const firstTask = currentTasks[0] || this.schedule[0];
    if (!firstTask) return;

    const dateObj = new Date(firstTask.date + 'T00:00:00');
    const dayNum = dateObj.getDate();
    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const monthShorts = ["OCA", "ŞUB", "MAR", "NİS", "MAY", "HAZ", "TEM", "AĞU", "EYL", "EKİ", "KAS", "ARA"];
    const monthName = monthNames[dateObj.getMonth()];
    const monthShort = monthShorts[dateObj.getMonth()];

    document.getElementById('today-day-number').textContent = dayNum;
    document.getElementById('today-month-name').textContent = monthShort;
    document.getElementById('today-full-date').textContent = `${dayNum} ${monthName} ${dateObj.getFullYear()}, ${firstTask.day_name}`;
    
    const isWeekend = firstTask.is_weekend;
    document.getElementById('today-academic-info').textContent = isWeekend
      ? `Programın ${firstTask.day_num}. Günü • Hafta Sonu Programı (${currentTasks.length} Görev)`
      : `Programın ${firstTask.day_num}. Günü • Hafta İçi Programı (1 Görev)`;

    const allCompleted = currentTasks.every(t => !!this.state.completedTasks[t.id]);
    const someCompleted = currentTasks.some(t => !!this.state.completedTasks[t.id]);
    const chipEl = document.getElementById('today-status-chip');
    if (chipEl) {
      if (allCompleted) {
        chipEl.className = 'shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center space-x-1';
        chipEl.innerHTML = '<i class="fa-solid fa-check mr-1 text-emerald-600"></i> Tamamlandı';
      } else if (someCompleted) {
        chipEl.className = 'shrink-0 px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 flex items-center space-x-1';
        chipEl.innerHTML = '1/2 Tamamlandı';
      } else {
        chipEl.className = 'shrink-0 px-3 py-1 text-[11px] font-black rounded-full fire-badge text-white shadow-md flex items-center space-x-1.5';
        chipEl.innerHTML = '<i class="fa-solid fa-fire text-amber-200 animate-bounce"></i><span>Günün Ödevi</span>';
      }
    }

    const container = document.getElementById('today-card-container');
    
    let cardsHtml = '';
    currentTasks.forEach((task, idx) => {
      const isActivity = (task.type === 'etkinlik');
      const isCompleted = !!this.state.completedTasks[task.id];
      const taskResult = this.state.testResults[task.id] || null;

      const bookBadgeColor = task.book.includes('MatBook')
        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800';

      const typeBadge = isActivity
        ? `<span class="px-3 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-xs font-extrabold tracking-wide uppercase flex items-center space-x-1.5"><i class="fa-solid fa-pen-fancy"></i><span>2 Sayfa Etkinlik</span></span>`
        : `<span class="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-extrabold tracking-wide uppercase flex items-center space-x-1.5"><i class="fa-solid fa-file-lines"></i><span>1 Adet Test</span></span>`;

      let resultSummaryHtml = '';
      if (isCompleted) {
        if (isActivity) {
          resultSummaryHtml = `
            <div class="mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">
                  <i class="fa-solid fa-check"></i>
                </div>
                <div>
                  <div class="text-sm font-bold text-emerald-900 dark:text-emerald-200">Etkinlik Tamamlandı</div>
                  <div class="text-xs text-emerald-700 dark:text-emerald-400">2 sayfalık uygulama ve konu adımları bitirildi.</div>
                </div>
              </div>
              <button onclick="appEngine.openTaskModal('${task.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition">
                Düzenle
              </button>
            </div>
          `;
        } else if (taskResult) {
          resultSummaryHtml = `
            <div class="mt-4 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="grid grid-cols-4 gap-3 text-center sm:text-left">
                <div>
                  <div class="text-[10px] font-bold text-slate-500 uppercase">Doğru</div>
                  <div class="text-lg font-black text-emerald-600 dark:text-emerald-400">${taskResult.correct || 0}</div>
                </div>
                <div>
                  <div class="text-[10px] font-bold text-slate-500 uppercase">Yanlış</div>
                  <div class="text-lg font-black text-rose-600 dark:text-rose-400">${taskResult.wrong || 0}</div>
                </div>
                <div>
                  <div class="text-[10px] font-bold text-slate-500 uppercase">Boş</div>
                  <div class="text-lg font-black text-slate-500">${taskResult.empty || 0}</div>
                </div>
                <div>
                  <div class="text-[10px] font-bold text-blue-600 uppercase">Net</div>
                  <div class="text-xl font-black text-blue-700 dark:text-blue-300">${taskResult.net || 0}</div>
                </div>
              </div>
              <button onclick="appEngine.openTaskModal('${task.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white self-end sm:self-center transition">
                Sonuç Düzenle
              </button>
            </div>
          `;
        }
      }

      const taskHeaderBadge = currentTasks.length > 1
        ? `<div class="flex items-center gap-2 mb-2">
            <span class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full fire-badge text-white text-xs font-black uppercase tracking-wider shadow-md">
              <i class="fa-solid fa-fire text-amber-200 animate-bounce"></i>
              <span>Günün Ödevi (${idx + 1}/${currentTasks.length})</span>
            </span>
           </div>`
        : `<div class="flex items-center gap-2 mb-2">
            <span class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full fire-badge text-white text-xs font-black uppercase tracking-wider shadow-md">
              <i class="fa-solid fa-fire text-amber-200 animate-bounce"></i>
              <span>Günün Ödevi</span>
            </span>
           </div>`;

      cardsHtml += `
        <div class="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-3.5 sm:space-y-5">
          ${taskHeaderBadge}

          <!-- Badges Bar -->
          <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
            ${typeBadge}
            <span class="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold ${bookBadgeColor}">
              ${task.book}
            </span>
            <span class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs font-bold">
              ${task.pages}
            </span>
            ${task.q_count ? `<span class="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs font-bold">${task.q_count} Soru</span>` : ''}
          </div>

          <!-- Task Title & Scope -->
          <div>
            <div class="text-[11px] sm:text-xs font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">
              ${task.theme} • ${task.subtopic}
            </div>
            <h2 class="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              ${task.title}
            </h2>
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 sm:mt-2 leading-relaxed">
              ${task.description}
            </p>
          </div>

          <!-- Action / Result Box -->
          ${(!isCompleted || (this._cardEditingTasks && this._cardEditingTasks[task.id])) ? `
            <div class="pt-2 space-y-3">
              <!-- Inline Hızlı Veri Girişi Paneli -->
              <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <i class="fa-solid fa-square-poll-vertical text-brand-600 dark:text-brand-400"></i>
                    <span>${isActivity ? 'Etkinlik Veri Girişi' : 'Test Veri Girişi'}</span>
                  </span>
                  <div class="flex items-center space-x-2">
                    ${isCompleted ? `
                      <button type="button" onclick="appEngine.toggleCardEditMode('${task.id}')" class="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline mr-1">
                        Vazgeç
                      </button>
                    ` : ''}
                    <span id="card-net-${task.id}" class="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900/60">
                      ${taskResult ? taskResult.net : '0.00'} Net
                    </span>
                  </div>
                </div>

                <!-- 4 Kutu: Doğru, Yanlış, Boş, Süre -->
                <div class="grid grid-cols-4 gap-2 text-center">
                  <div class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 p-2 sm:p-2.5 rounded-xl">
                    <label class="block text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 mb-0.5">DOĞRU</label>
                    <input type="number" id="card-d-${task.id}" min="0" max="100" placeholder="0" 
                      value="${taskResult ? (taskResult.correct ?? '') : ''}" 
                      oninput="appEngine.calcCardNet('${task.id}')" 
                      class="w-full text-center text-lg sm:text-xl font-black bg-transparent text-emerald-800 dark:text-emerald-200 focus:outline-none">
                  </div>

                  <div class="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 p-2 sm:p-2.5 rounded-xl">
                    <label class="block text-[10px] font-extrabold text-rose-700 dark:text-rose-300 mb-0.5">YANLIŞ</label>
                    <input type="number" id="card-y-${task.id}" min="0" max="100" placeholder="0" 
                      value="${taskResult ? (taskResult.wrong ?? '') : ''}" 
                      oninput="appEngine.calcCardNet('${task.id}')" 
                      class="w-full text-center text-lg sm:text-xl font-black bg-transparent text-rose-800 dark:text-rose-200 focus:outline-none">
                  </div>

                  <div class="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 sm:p-2.5 rounded-xl">
                    <label class="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 mb-0.5">BOŞ</label>
                    <input type="number" id="card-b-${task.id}" min="0" max="100" placeholder="0" 
                      value="${taskResult ? (taskResult.empty ?? '') : ''}" 
                      oninput="appEngine.calcCardNet('${task.id}')" 
                      class="w-full text-center text-lg sm:text-xl font-black bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none">
                  </div>

                  <div class="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 p-2 sm:p-2.5 rounded-xl">
                    <label class="block text-[10px] font-extrabold text-amber-700 dark:text-amber-300 mb-0.5">SÜRE (DK)</label>
                    <input type="number" id="card-dur-${task.id}" min="1" max="180" placeholder="20" 
                      value="${taskResult ? (taskResult.duration || 20) : 20}" 
                      class="w-full text-center text-lg sm:text-xl font-black bg-transparent text-amber-800 dark:text-amber-200 focus:outline-none">
                  </div>
                </div>
              </div>

              <!-- Kaydet Butonu -->
              <button onclick="appEngine.saveCardResult('${task.id}')" class="w-full py-3 sm:py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-brand-600/30 flex items-center justify-center space-x-2 transition transform active:scale-[0.98]">
                <i class="fa-solid fa-circle-check text-base sm:text-lg"></i>
                <span>${isCompleted ? 'Sonucu Güncelle & Kaydet' : 'Ödev Sonucunu Kaydet & Tamamla'}</span>
              </button>

              <!-- Soru Yükleme Butonu -->
              <button onclick="appEngine.openUploadQuestionModalForTask('${task.id}')" class="w-full py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition hover:bg-indigo-100/60 active:scale-[0.98]">
                <i class="fa-solid fa-camera text-sm text-indigo-500"></i>
                <span class="truncate">Yapamadığım Soruyu Çek & Yükle</span>
              </button>
            </div>
          ` : `
            <div class="space-y-2.5 pt-2">
              <div class="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-2">
                <div class="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                  <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
                    <i class="fa-solid fa-check"></i>
                  </div>
                  <div class="min-w-0">
                    <div class="text-xs sm:text-sm font-extrabold text-emerald-900 dark:text-emerald-200 truncate">
                      ${isActivity ? 'Etkinlik Tamamlandı' : 'Test Tamamlandı'}
                    </div>
                    <div class="text-[11px] sm:text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">
                      ${taskResult ? `${taskResult.correct || 0}D • ${taskResult.wrong || 0}Y • ${taskResult.empty || 0}B • <b class="text-blue-600 dark:text-blue-400">${taskResult.net || 0} Net</b> (${taskResult.duration || 20} dk)` : 'Tamamlandı'}
                    </div>
                  </div>
                </div>
                <button onclick="appEngine.toggleCardEditMode('${task.id}')" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-slate-700 transition flex items-center space-x-1 shrink-0">
                  <i class="fa-solid fa-pen-to-square"></i>
                  <span>Düzenle</span>
                </button>
              </div>

              <button onclick="appEngine.openUploadQuestionModalForTask('${task.id}')" class="w-full py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition hover:bg-indigo-100/60 active:scale-[0.98]">
                <i class="fa-solid fa-camera text-sm text-indigo-500"></i>
                <span class="truncate">Yapamadığım Soruyu Çek & Yükle</span>
              </button>
            </div>
          `}

        </div>
      `;
    });

    container.innerHTML = `<div class="space-y-4">${cardsHtml}</div>`;
  }

  calcCardNet(taskId) {
    const c = parseFloat(document.getElementById(`card-d-${taskId}`)?.value) || 0;
    const w = parseFloat(document.getElementById(`card-y-${taskId}`)?.value) || 0;
    const net = Math.max(0, c - (w / 4));
    const netEl = document.getElementById(`card-net-${taskId}`);
    if (netEl) netEl.textContent = `${net.toFixed(2)} Net`;
  }

  saveCardResult(taskId) {
    const task = this.schedule.find(s => s.id === taskId);
    if (!task) return;
    const c = parseInt(document.getElementById(`card-d-${taskId}`)?.value) || 0;
    const w = parseInt(document.getElementById(`card-y-${taskId}`)?.value) || 0;
    const b = parseInt(document.getElementById(`card-b-${taskId}`)?.value) || 0;
    const duration = parseInt(document.getElementById(`card-dur-${taskId}`)?.value) || 20;
    const net = Math.max(0, Math.round((c - (w / 4)) * 100) / 100);
    const isActivity = (task.type === 'etkinlik');

    this.state.completedTasks[task.id] = true;
    this.state.testResults[task.id] = {
      isActivity: isActivity,
      totalQ: c + w + b,
      correct: c,
      wrong: w,
      empty: b,
      net: net,
      duration: duration,
      notes: (this.state.testResults[task.id]?.notes) || '',
      timestamp: new Date().toISOString()
    };
    if (this._cardEditingTasks) delete this._cardEditingTasks[taskId];

    const xpEarned = isActivity ? 50 : 100;
    this.addXp(xpEarned);
    this.updateStreak();
    this.confettiCelebration();
    this.saveState();
    this.renderAllViews();
    this.showToast(`Ödev kaydedildi: ${c}D ${w}Y ${b}B • ${net.toFixed(2)} Net! +${xpEarned} XP`, 'fa-circle-check', 'text-emerald-500');
  }

  toggleCardEditMode(taskId) {
    if (!this._cardEditingTasks) this._cardEditingTasks = {};
    this._cardEditingTasks[taskId] = !this._cardEditingTasks[taskId];
    this.renderTodayView();
  }

  // TAB 2: SCHEDULE
  renderScheduleThemePills() {
    const container = document.getElementById('schedule-theme-pills');
    if (!container) return;

    const themes = [
      { id: 'all', name: 'Tüm Temalar' },
      { id: '1. Tema', name: '1. Sayılar' },
      { id: '2. Tema', name: '2. Nicelikler' },
      { id: '3. Tema', name: '3. Geometri' },
      { id: '4. Tema', name: '4. Eşlik & Benzerlik' },
      { id: '5. Tema', name: '5. Algoritma' },
      { id: '6. Tema', name: '6. İstatistik' },
      { id: '7. Tema', name: '7. Olasılık' }
    ];

    container.innerHTML = themes.map(t => `
      <button onclick="appEngine.filterByTheme('${t.id}')" class="theme-pill-btn whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition ${this.selectedThemeFilter === t.id ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}">
        ${t.name}
      </button>
    `).join('');
  }

  filterByTheme(themeId) {
    this.selectedThemeFilter = themeId;
    this.renderScheduleThemePills();
    this.filterSchedule();
  }

  filterSchedule() {
    this.renderScheduleView();
  }

  renderScheduleView() {
    const container = document.getElementById('schedule-list-container');
    if (!container) return;

    const searchInput = (document.getElementById('schedule-search-input')?.value || '').toLowerCase();
    const monthFilter = document.getElementById('schedule-month-filter')?.value || 'all';
    const typeFilter = document.getElementById('schedule-type-filter')?.value || 'all';

    let filtered = this.schedule.filter(task => {
      if (searchInput) {
        const text = `${task.title} ${task.theme} ${task.subtopic} ${task.book} ${task.pages}`.toLowerCase();
        if (!text.includes(searchInput)) return false;
      }
      if (monthFilter !== 'all' && !task.date.startsWith(monthFilter)) {
        return false;
      }
      if (typeFilter === 'test' && task.type !== 'test') return false;
      if (typeFilter === 'etkinlik' && task.type !== 'etkinlik') return false;
      if (typeFilter === 'completed' && !this.state.completedTasks[task.id]) return false;
      if (typeFilter === 'pending' && this.state.completedTasks[task.id]) return false;
      if (this.selectedThemeFilter !== 'all' && !task.theme.includes(this.selectedThemeFilter)) return false;

      return true;
    });

    const counterEl = document.getElementById('schedule-counter-text');
    if (counterEl) counterEl.textContent = `${filtered.length} Görev Listeleniyor (Bitiş: 1 Haziran 2027)`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
          <i class="fa-solid fa-filter-circle-xmark text-4xl mb-3 text-slate-300 dark:text-slate-600"></i>
          <p class="text-sm font-semibold">Filtre kriterlerine uygun ödev bulunamadı.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(task => {
      const isDone = !!this.state.completedTasks[task.id];
      const isActivity = (task.type === 'etkinlik');
      const isToday = (task.date === this.state.currentDateStr);
      const res = this.state.testResults[task.id] || null;

      const borderClass = isToday
        ? 'ring-2 ring-brand-500 bg-blue-50/30 dark:bg-blue-950/20'
        : 'bg-white dark:bg-slate-900';

      const typeBadge = isActivity
        ? `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">Etkinlik (2 Sayfa)</span>`
        : `<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Test (1 Adet)</span>`;

      const weekendTaskTag = task.daily_task_total > 1
        ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">H.Sonu Görev ${task.daily_task_index}/${task.daily_task_total}</span>`
        : '';

      return `
        <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 ${borderClass} shadow-sm hover:shadow transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div class="flex items-start space-x-3.5">
            <button onclick="appEngine.toggleTaskQuick('${task.id}')" class="mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-brand-500'}">
              ${isDone ? '<i class="fa-solid fa-check text-xs"></i>' : ''}
            </button>

            <div>
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                <span class="text-xs font-bold text-slate-400">#${task.id.replace('task-', '')}</span>
                <span class="text-xs font-bold text-slate-700 dark:text-slate-300">${task.date} (${task.day_name})</span>
                ${typeBadge}
                ${weekendTaskTag}
                <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">${task.book}</span>
                <span class="text-[11px] font-semibold text-slate-400">• ${task.pages}</span>
              </div>
              <h4 class="text-sm font-bold text-slate-900 dark:text-white">
                ${task.title}
              </h4>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${task.subtopic}</p>
            </div>
          </div>

          <div class="flex items-center space-x-2 self-end sm:self-center shrink-0">
            ${isDone && res && !isActivity ? `
              <div class="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs font-black text-blue-700 dark:text-blue-300">
                ${res.net} Net
              </div>
            ` : ''}

            <button onclick="appEngine.openUploadQuestionModalForTask('${task.id}')" title="Bu ödevden soru yükle" class="w-8 h-8 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 flex items-center justify-center transition">
              <i class="fa-solid fa-camera"></i>
            </button>

            <button onclick="appEngine.openTaskModal('${task.id}')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition">
              ${isDone ? 'Sonuç Gör / Düzenle' : 'Veri Gir'}
            </button>
          </div>

        </div>
      `;
    }).join('');
  }

  scrollToTodayInSchedule() {
    this.selectedThemeFilter = 'all';
    this.renderScheduleThemePills();
    const monthFilter = document.getElementById('schedule-month-filter');
    if (monthFilter) monthFilter.value = 'all';
    const typeFilter = document.getElementById('schedule-type-filter');
    if (typeFilter) typeFilter.value = 'all';
    this.renderScheduleView();

    setTimeout(() => {
      const todayEl = document.querySelector('.ring-brand-500');
      if (todayEl) {
        todayEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  // TAB 3: DENEME SINAVLARI
  renderDenemeSubjectInputs() {
    const container = document.getElementById('deneme-subjects-inputs-container');
    if (!container) return;

    container.innerHTML = this.denemeSubjects.map(sub => `
      <div class="grid grid-cols-12 gap-1.5 sm:gap-2 items-center bg-slate-50 dark:bg-slate-800/60 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
        <div class="col-span-3 sm:col-span-3 font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 truncate">
          <i class="fa-solid ${sub.icon} ${sub.color} text-sm flex-shrink-0"></i>
          <span class="truncate" title="${sub.name}">${sub.name}</span>
        </div>
        <div class="col-span-2 sm:col-span-2">
          <input type="number" id="sub-q-${sub.id}" placeholder="Soru" min="0" max="100" value="${sub.defaultQ || ''}" oninput="appEngine.calcDenemeModalTotalNet('${sub.id}', 'q')" title="${sub.name} Soru Sayısı" class="w-full text-center py-1.5 px-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-1 focus:ring-rose-500">
        </div>
        <div class="col-span-2 sm:col-span-2">
          <input type="number" id="sub-d-${sub.id}" placeholder="D" min="0" max="100" oninput="appEngine.calcDenemeModalTotalNet('${sub.id}', 'd')" title="Doğru Sayısı" class="w-full text-center py-1.5 px-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500">
        </div>
        <div class="col-span-2 sm:col-span-2">
          <input type="number" id="sub-y-${sub.id}" placeholder="Y" min="0" max="100" oninput="appEngine.calcDenemeModalTotalNet('${sub.id}', 'y')" title="Yanlış Sayısı" class="w-full text-center py-1.5 px-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-rose-700 dark:text-rose-400 font-bold focus:outline-none focus:ring-1 focus:ring-rose-500">
        </div>
        <div class="col-span-1 sm:col-span-1">
          <input type="number" id="sub-b-${sub.id}" placeholder="B" min="0" max="100" oninput="appEngine.calcDenemeModalTotalNet('${sub.id}', 'b')" title="Boş Sayısı" class="w-full text-center py-1.5 px-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 font-bold focus:outline-none focus:ring-1 focus:ring-slate-400">
        </div>
        <div class="col-span-2 sm:col-span-2 text-right font-black text-blue-600 dark:text-blue-400 text-xs sm:text-sm" id="sub-net-${sub.id}">
          0.00 N
        </div>
      </div>
    `).join('');
  }

  calcSubjectStats() {
    const denemeler = this.state.denemeler || [];
    const stats = {};

    this.denemeSubjects.forEach(s => {
      stats[s.id] = {
        id: s.id,
        name: s.name,
        icon: s.icon,
        color: s.color,
        defaultQ: s.defaultQ || 10,
        examCount: 0,
        totalQ: 0,
        totalD: 0,
        totalY: 0,
        totalB: 0,
        totalNet: 0,
        nets: [],
        maxNet: 0,
        latestNet: 0,
        prevNet: null
      };
    });

    denemeler.forEach((d, idx) => {
      if (!d.subjects) return;
      this.denemeSubjects.forEach(s => {
        const sub = d.subjects[s.id];
        if (sub && (sub.d > 0 || sub.y > 0 || sub.b > 0 || sub.net > 0 || (sub.q && sub.q > 0))) {
          const item = stats[s.id];
          item.examCount++;
          item.totalQ += (sub.q || s.defaultQ || 0);
          item.totalD += (sub.d || 0);
          item.totalY += (sub.y || 0);
          item.totalB += (sub.b || 0);
          item.totalNet += (sub.net || 0);
          item.nets.push(sub.net || 0);
          if (sub.net > item.maxNet) item.maxNet = sub.net;
          if (idx === denemeler.length - 1) {
            item.latestNet = sub.net || 0;
          }
          if (idx === denemeler.length - 2) {
            item.prevNet = sub.net || 0;
          }
        }
      });
    });

    this.denemeSubjects.forEach(s => {
      const item = stats[s.id];
      if (item.examCount > 0) {
        item.avgNet = Math.round((item.totalNet / item.examCount) * 100) / 100;
        item.avgD = Math.round((item.totalD / item.examCount) * 10) / 10;
        item.avgY = Math.round((item.totalY / item.examCount) * 10) / 10;
        item.avgB = Math.round((item.totalB / item.examCount) * 10) / 10;
        item.avgQ = Math.round((item.totalQ / item.examCount) * 10) / 10;
        item.successRate = item.avgQ > 0 ? Math.min(100, Math.max(0, Math.round((item.avgNet / item.avgQ) * 100))) : 0;
        item.trendDelta = item.prevNet !== null ? Math.round((item.latestNet - item.prevNet) * 100) / 100 : null;
      } else {
        item.avgNet = 0;
        item.avgD = 0;
        item.avgY = 0;
        item.avgB = 0;
        item.avgQ = s.defaultQ || 10;
        item.successRate = 0;
        item.trendDelta = null;
      }
    });

    return stats;
  }

  renderDenemelerView() {
    const listContainer = document.getElementById('deneme-list-container');
    const denemeler = this.state.denemeler || [];
    const countBadge = document.getElementById('deneme-history-count-badge');
    if (countBadge) countBadge.textContent = `${denemeler.length} Sınav`;

    // Toggle sample deneme button label
    const sampleBtnText = document.getElementById('btn-sample-deneme-text');
    const hasSample = denemeler.some(d => d.isSample);
    if (sampleBtnText) {
      sampleBtnText.textContent = hasSample ? 'Örnekleri Temizle' : 'Örnek Deneme Yükle';
    }

    let totalNets = 0;
    let maxNet = 0;
    let latestNet = 0;
    let totalAllQ = 0;
    let totalAllD = 0;

    if (denemeler.length > 0) {
      denemeler.forEach(d => {
        totalNets += (d.totalNet || 0);
        totalAllQ += (d.totalQ || 0);
        totalAllD += (d.totalD || 0);
        if (d.totalNet > maxNet) maxNet = d.totalNet;
      });
      latestNet = denemeler[denemeler.length - 1].totalNet || 0;
      const prevNet = denemeler.length > 1 ? (denemeler[denemeler.length - 2].totalNet || 0) : null;

      document.getElementById('deneme-stat-count').textContent = denemeler.length;
      document.getElementById('deneme-stat-avg').textContent = (totalNets / denemeler.length).toFixed(2);
      document.getElementById('deneme-stat-max').textContent = maxNet.toFixed(2);
      document.getElementById('deneme-stat-latest').textContent = latestNet.toFixed(2);

      const latestDiffEl = document.getElementById('deneme-stat-latest-diff');
      if (latestDiffEl) {
        if (prevNet !== null) {
          const diff = Math.round((latestNet - prevNet) * 100) / 100;
          if (diff >= 0) {
            latestDiffEl.className = 'text-[11px] text-emerald-500 font-bold mt-0.5';
            latestDiffEl.innerHTML = `<i class="fa-solid fa-arrow-trend-up mr-0.5"></i>+${diff.toFixed(2)} Net Artış`;
          } else {
            latestDiffEl.className = 'text-[11px] text-rose-500 font-bold mt-0.5';
            latestDiffEl.innerHTML = `<i class="fa-solid fa-arrow-trend-down mr-0.5"></i>${diff.toFixed(2)} Net Fark`;
          }
        } else {
          latestDiffEl.className = 'text-[11px] text-purple-500 mt-0.5';
          latestDiffEl.textContent = 'İlk Sınav Skoru';
        }
      }

      const accPct = totalAllQ > 0 ? Math.round((totalAllD / totalAllQ) * 100) : 0;
      const accEl = document.getElementById('deneme-stat-accuracy');
      if (accEl) accEl.textContent = `%${accPct}`;
    } else {
      document.getElementById('deneme-stat-count').textContent = '0';
      document.getElementById('deneme-stat-avg').textContent = '0.00';
      document.getElementById('deneme-stat-max').textContent = '0.00';
      document.getElementById('deneme-stat-latest').textContent = '0.00';
      const accEl = document.getElementById('deneme-stat-accuracy');
      if (accEl) accEl.textContent = '%0';
      const latestDiffEl = document.getElementById('deneme-stat-latest-diff');
      if (latestDiffEl) {
        latestDiffEl.className = 'text-[11px] text-purple-500 mt-0.5';
        latestDiffEl.textContent = 'Son Sınav Skoru';
      }
    }

    const subjectStats = this.calcSubjectStats();

    // 1. Akıllı Pedagoji & Rehberlik Kartı
    this.renderDenemePedagogyAdvice(subjectStats, denemeler);

    // 2. Çizgi Grafiği (Net Gelişim Trendi)
    this.renderDenemeChart();

    // 3. Radar & Bar Grafiği (Derslerin Güç Haritası)
    this.renderDenemeRadarChart(subjectStats);

    // 4. Her Bir Dersin Ayrıntılı Analiz Kartları
    this.renderDenemeSubjectCards(subjectStats);

    // 5. Geçmiş Sınavlar Listesi
    if (listContainer) {
      if (denemeler.length === 0) {
        listContainer.innerHTML = `
          <div class="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-3">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center text-2xl">
              <i class="fa-solid fa-chart-pie"></i>
            </div>
            <div class="space-y-1">
              <p class="text-sm font-bold text-slate-800 dark:text-slate-200">Henüz kaydedilmiş deneme sınavı sonucu yok.</p>
              <p class="text-xs text-slate-400 max-w-md mx-auto">Okulda veya kurumda girdiğin denemenin sonucunu girebilir ya da analiz grafiğini hemen görmek için yukarıdaki "Örnek Deneme Yükle" butonuna dokunabilirsin.</p>
            </div>
            <div class="pt-2 flex items-center justify-center gap-3">
              <button onclick="appEngine.toggleSampleDenemeData()" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition">
                <i class="fa-solid fa-wand-magic-sparkles mr-1 text-amber-500"></i> Örnek Deneme Yükle
              </button>
              <button onclick="appEngine.openNewDenemeModal()" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-md shadow-rose-600/30">
                <i class="fa-solid fa-plus-circle mr-1"></i> Yeni Sınav Ekle
              </button>
            </div>
          </div>
        `;
      } else {
        listContainer.innerHTML = denemeler.slice().reverse().map(d => {
          let subjectsHtml = '';
          if (d.subjects) {
            subjectsHtml = Object.keys(d.subjects).map(k => {
              const sub = d.subjects[k];
              if (!sub || (sub.d === 0 && sub.y === 0 && sub.b === 0 && (!sub.q || sub.q === 0))) return '';
              const match = this.denemeSubjects.find(s => s.id === k);
              const name = match ? match.name : k;
              const qText = sub.q ? ` / ${sub.q}S` : '';
              return `<span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                ${name}: <b class="text-rose-600 dark:text-rose-400 font-extrabold">${sub.net} N</b> (${sub.d}D / ${sub.y}Y${qText})
              </span>`;
            }).join('');
          }

          const isSampleBadge = d.isSample ? `<span class="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">Örnek Veri</span>` : '';

          return `
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition">
              <div class="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <div class="flex items-center space-x-2 flex-wrap">
                    <h4 class="text-base font-extrabold text-slate-900 dark:text-white">${d.name}</h4>
                    ${isSampleBadge}
                    <span class="text-xs text-slate-400 font-medium">• ${d.date}</span>
                  </div>
                  ${d.notes ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">"${d.notes}"</p>` : ''}
                </div>
                <div class="text-right">
                  <div class="text-2xl font-black text-rose-600 dark:text-rose-400">${(d.totalNet || 0).toFixed(2)} Net</div>
                  <div class="text-[11px] text-slate-400">${d.totalQ ? `<b class="text-slate-700 dark:text-slate-300 font-bold">${d.totalQ} Soru</b> • ` : ''}<span class="text-emerald-600 font-bold">${d.totalD || 0}D</span> • <span class="text-rose-500 font-bold">${d.totalY || 0}Y</span> • <span class="text-slate-400">${d.totalB || 0}B</span></div>
                </div>
              </div>

              <div class="flex flex-wrap gap-1.5 pt-1">
                ${subjectsHtml}
              </div>

              <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <span class="text-slate-400 text-[11px]">Sınav ID: ${d.id}</span>
                <button onclick="appEngine.deleteDeneme('${d.id}')" class="font-bold text-rose-500 hover:text-rose-700 transition flex items-center space-x-1">
                  <i class="fa-solid fa-trash-can"></i>
                  <span>Sil</span>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // -------------------------------------------------------------------------
  // MÜFİT HOCA'DAN AKILLI DENEME DEĞERLENDİRMESİ & STRATEJİ
  // -------------------------------------------------------------------------
  renderDenemePedagogyAdvice(subjectStats, denemeler) {
    const container = document.getElementById('deneme-pedagogy-container');
    if (!container) return;

    if (!denemeler || denemeler.length === 0) {
      container.innerHTML = '';
      return;
    }

    // Find star subject (highest success rate with at least 1 exam)
    const activeSubjects = Object.values(subjectStats).filter(s => s.examCount > 0);
    if (activeSubjects.length === 0) {
      container.innerHTML = '';
      return;
    }

    activeSubjects.sort((a, b) => b.successRate - a.successRate);
    const starSubject = activeSubjects[0];

    // Find highest potential subject (lowest success rate or highest avg wrong)
    const potentialSubjects = [...activeSubjects].sort((a, b) => b.avgY - a.avgY || a.successRate - b.successRate);
    const opportunitySubject = potentialSubjects[0];

    // Momentum (first exam vs last exam)
    const firstNet = denemeler[0].totalNet || 0;
    const lastNet = denemeler[denemeler.length - 1].totalNet || 0;
    const diffNet = Math.round((lastNet - firstNet) * 100) / 100;

    let momentumHtml = '';
    if (denemeler.length > 1) {
      if (diffNet > 0) {
        momentumHtml = `
          <div class="flex items-center space-x-2 text-emerald-300 font-bold text-xs">
            <i class="fa-solid fa-arrow-trend-up text-sm"></i>
            <span>İlk denemenden bu yana <b>+${diffNet.toFixed(2)} Netlik</b> harika bir gelişim ivmesi yakaladın! 🚀</span>
          </div>
        `;
      } else if (diffNet === 0) {
        momentumHtml = `
          <div class="flex items-center space-x-2 text-indigo-200 font-bold text-xs">
            <i class="fa-solid fa-equals text-sm"></i>
            <span>Net seviyen dengeli ve kararlı ilerliyor.</span>
          </div>
        `;
      } else {
        momentumHtml = `
          <div class="flex items-center space-x-2 text-amber-300 font-bold text-xs">
            <i class="fa-solid fa-compass text-sm"></i>
            <span>Son denemedeki zorluk derecesine göre moralini bozma, analizlerini eksiksiz yapalım!</span>
          </div>
        `;
      }
    }

    container.innerHTML = `
      <div class="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-xl border border-indigo-500/30 space-y-3.5">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center space-x-2">
            <img src="mufit-hoca-logo.jpg" alt="Müfit Hoca" class="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-400/50 shadow-md">
            <span class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold uppercase tracking-wider">
              <i class="fa-solid fa-brain text-amber-400"></i>
              <span>Müfit Hoca'dan Akıllı Deneme Analizi</span>
            </span>
          </div>
          <span class="text-xs text-indigo-300/80 font-semibold">${denemeler.length} Sınav Verisi İncelendi</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <!-- Sol: En Güçlü Ders -->
          <div class="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1">
            <div class="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
              <i class="fa-solid fa-crown text-amber-400"></i>
              <span>En Güçlü Kalen: ${starSubject.name}</span>
            </div>
            <p class="text-xs text-slate-200 leading-relaxed">
              Bu derste <b>%${starSubject.successRate} başarı oranı</b> ve <b>${starSubject.avgNet.toFixed(2)} Net ortalaması</b> ile harika gidiyorsun. Bu istikrarı korumak sınavda sana büyük özgüven kazandıracak!
            </p>
          </div>

          <!-- Sağ: Net Kazandıracak Ders -->
          <div class="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1">
            <div class="flex items-center space-x-2 text-amber-300 font-bold text-xs">
              <i class="fa-solid fa-crosshairs text-rose-400"></i>
              <span>En Çok Net Kazandıracak Ders: ${opportunitySubject.name}</span>
            </div>
            <p class="text-xs text-slate-200 leading-relaxed">
              Ortalama <b>${opportunitySubject.avgY} yanlış</b> yapıyorsun. Bu dersteki soru analizi ve konu tekrarlarıyla doğrudan <b>+${Math.max(1.5, opportunitySubject.avgY).toFixed(1)} net</b> kazanabilirsin!
            </p>
          </div>
        </div>

        ${momentumHtml ? `<div class="pt-1 border-t border-white/10">${momentumHtml}</div>` : ''}
      </div>
    `;
  }

  // -------------------------------------------------------------------------
  // ÇİZGİ GRAFİK: NET GELİŞİM TRENDİ (ANİMASYONLU & FİLTRELİ)
  // -------------------------------------------------------------------------
  setDenemeChartFilter(filterKey) {
    this.denemeActiveFilter = filterKey;

    const selectEl = document.getElementById('deneme-subject-chart-filter');
    if (selectEl) selectEl.value = filterKey;

    const pills = document.querySelectorAll('#deneme-chart-filter-pills .deneme-pill');
    pills.forEach(p => {
      const match = p.getAttribute('data-filter') === filterKey;
      if (match) {
        p.className = 'deneme-pill active px-3 py-1 rounded-lg font-bold bg-rose-600 text-white transition active:scale-95 shadow-sm';
      } else {
        p.className = 'deneme-pill px-3 py-1 rounded-lg font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition active:scale-95';
      }
    });

    const titleEl = document.getElementById('deneme-chart-title');
    if (titleEl) {
      if (filterKey === 'all') titleEl.textContent = 'Net Gelişim Trendi (Tüm Dersler - Toplam Net)';
      else if (filterKey === 'fen_group') titleEl.textContent = 'Fen Grubu Gelişim Trendi (Fizik + Kimya + Biyoloji)';
      else if (filterKey === 'sosyal_group') titleEl.textContent = 'Sosyal Grubu Gelişim Trendi (Tarih + Coğrafya + Din)';
      else {
        const found = this.denemeSubjects.find(s => s.id === filterKey);
        titleEl.textContent = `${found ? found.name : filterKey} Net Gelişim Trendi`;
      }
    }

    this.renderDenemeChart();
  }

  renderDenemeChart() {
    const canvas = document.getElementById('denemeNetChart');
    if (!canvas) return;

    const denemeler = this.state.denemeler || [];
    const filter = this.denemeActiveFilter || 'all';

    const labels = denemeler.length > 0
      ? denemeler.map(d => `${d.name.length > 14 ? d.name.substring(0, 12) + '..' : d.name} (${d.date.substring(5)})`)
      : ['Örnek 1', 'Örnek 2', 'Örnek 3'];

    let primaryData = [];
    let primaryLabel = 'Toplam Net';
    let primaryColor = '#e11d48'; // Rose
    let secondaryData = null;
    let secondaryLabel = '';

    if (denemeler.length === 0) {
      primaryData = [0, 0, 0];
    } else if (filter === 'all') {
      primaryData = denemeler.map(d => d.totalNet || 0);
      primaryLabel = 'Toplam Net';
      primaryColor = '#e11d48';

      // Compare with math
      secondaryData = denemeler.map(d => (d.subjects && d.subjects.matematik) ? (d.subjects.matematik.net || 0) : 0);
      secondaryLabel = 'Matematik Neti';
    } else if (filter === 'fen_group') {
      primaryData = denemeler.map(d => {
        if (!d.subjects) return 0;
        const fiz = (d.subjects.fizik && d.subjects.fizik.net) || 0;
        const kim = (d.subjects.kimya && d.subjects.kimya.net) || 0;
        const biyo = (d.subjects.biyoloji && d.subjects.biyoloji.net) || 0;
        return Math.round((fiz + kim + biyo) * 100) / 100;
      });
      primaryLabel = 'Fen Grubu Toplam Net';
      primaryColor = '#10b981'; // Emerald
    } else if (filter === 'sosyal_group') {
      primaryData = denemeler.map(d => {
        if (!d.subjects) return 0;
        const tar = (d.subjects.tarih && d.subjects.tarih.net) || 0;
        const cog = (d.subjects.cografya && d.subjects.cografya.net) || 0;
        const din = (d.subjects.din_felsefe && d.subjects.din_felsefe.net) || 0;
        return Math.round((tar + cog + din) * 100) / 100;
      });
      primaryLabel = 'Sosyal Grubu Toplam Net';
      primaryColor = '#f59e0b'; // Amber
    } else {
      // Single subject
      const subObj = this.denemeSubjects.find(s => s.id === filter);
      primaryLabel = `${subObj ? subObj.name : filter} Neti`;
      primaryColor = '#6366f1'; // Indigo
      primaryData = denemeler.map(d => (d.subjects && d.subjects[filter]) ? (d.subjects[filter].net || 0) : 0);

      // Average reference
      const avg = primaryData.reduce((a, b) => a + b, 0) / (primaryData.length || 1);
      secondaryData = primaryData.map(() => Math.round(avg * 100) / 100);
      secondaryLabel = `Ortalama (${avg.toFixed(2)} N)`;
    }

    if (this.denemeChartInstance) {
      this.denemeChartInstance.destroy();
    }

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const datasets = [
      {
        label: primaryLabel,
        data: primaryData,
        borderColor: primaryColor,
        backgroundColor: primaryColor === '#e11d48'
          ? 'rgba(225, 29, 72, 0.12)'
          : primaryColor === '#10b981'
            ? 'rgba(16, 185, 129, 0.12)'
            : 'rgba(99, 102, 241, 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: primaryColor
      }
    ];

    if (secondaryData) {
      datasets.push({
        label: secondaryLabel,
        data: secondaryData,
        borderColor: '#3b82f6',
        backgroundColor: 'transparent',
        tension: 0.2,
        borderWidth: 2,
        borderDash: [5, 5],
        pointRadius: filter === 'all' ? 4 : 0
      });
    }

    this.denemeChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 900,
          easing: 'easeOutQuart'
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10, weight: '600' } }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10, weight: '600' } },
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: textColor, font: { size: 11, weight: 'bold' }, boxWidth: 14 }
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: isDark ? '#fff' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            padding: 10,
            boxPadding: 4,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} Net`
            }
          }
        }
      }
    });
  }

  // -------------------------------------------------------------------------
  // RADAR & BAR GRAFİĞİ: DERSLERİN GÜÇ & BAŞARI HARİTASI
  // -------------------------------------------------------------------------
  toggleDenemeRadarMode(mode) {
    this.denemeRadarMode = mode;
    const radarBtn = document.getElementById('btn-radar-mode-radar');
    const barBtn = document.getElementById('btn-radar-mode-bar');

    if (mode === 'radar') {
      if (radarBtn) radarBtn.className = 'px-2.5 py-1 rounded-lg font-bold bg-indigo-600 text-white shadow-sm transition';
      if (barBtn) barBtn.className = 'px-2.5 py-1 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition';
    } else {
      if (barBtn) barBtn.className = 'px-2.5 py-1 rounded-lg font-bold bg-indigo-600 text-white shadow-sm transition';
      if (radarBtn) radarBtn.className = 'px-2.5 py-1 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition';
    }

    this.renderDenemeRadarChart(this.calcSubjectStats());
  }

  renderDenemeRadarChart(subjectStats) {
    const canvas = document.getElementById('denemeSubjectRadarChart');
    if (!canvas) return;

    if (this.denemeRadarChartInstance) {
      this.denemeRadarChartInstance.destroy();
    }

    const denemeler = this.state.denemeler || [];
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    const labels = this.denemeSubjects.map(s => s.name);
    const avgRates = this.denemeSubjects.map(s => subjectStats[s.id].successRate || 0);

    // Latest exam rates if exists
    let latestRates = null;
    if (denemeler.length > 0) {
      const lastExam = denemeler[denemeler.length - 1];
      if (lastExam.subjects) {
        latestRates = this.denemeSubjects.map(s => {
          const sub = lastExam.subjects[s.id];
          if (!sub) return 0;
          const q = sub.q || s.defaultQ || 10;
          return q > 0 ? Math.min(100, Math.max(0, Math.round(((sub.net || 0) / q) * 100))) : 0;
        });
      }
    }

    const mode = this.denemeRadarMode || 'radar';

    if (mode === 'radar') {
      const datasets = [
        {
          label: 'Genel Ortalama Başarı (%)',
          data: avgRates,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.25)',
          pointBackgroundColor: '#6366f1',
          pointHoverRadius: 6,
          borderWidth: 2
        }
      ];

      if (latestRates && denemeler.length > 1) {
        datasets.push({
          label: 'Son Sınav Başarısı (%)',
          data: latestRates,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.20)',
          pointBackgroundColor: '#f43f5e',
          pointHoverRadius: 6,
          borderWidth: 2
        });
      }

      this.denemeRadarChartInstance = new Chart(canvas, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 900,
            easing: 'easeOutQuart'
          },
          scales: {
            r: {
              angleLines: { color: gridColor },
              grid: { color: gridColor },
              pointLabels: {
                color: textColor,
                font: { size: 9, weight: 'bold' }
              },
              ticks: {
                backdropColor: 'transparent',
                color: textColor,
                font: { size: 8 },
                stepSize: 20
              },
              suggestedMin: 0,
              suggestedMax: 100
            }
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, font: { size: 10, weight: 'bold' }, boxWidth: 12 }
            }
          }
        }
      });
    } else {
      // Horizontal bar chart
      const avgNets = this.denemeSubjects.map(s => subjectStats[s.id].avgNet || 0);
      const maxNets = this.denemeSubjects.map(s => subjectStats[s.id].maxNet || 0);

      this.denemeRadarChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Ortalama Net',
              data: avgNets,
              backgroundColor: 'rgba(99, 102, 241, 0.85)',
              borderRadius: 6
            },
            {
              label: 'Zirve Net 🏆',
              data: maxNets,
              backgroundColor: 'rgba(245, 158, 11, 0.85)',
              borderRadius: 6
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          animation: {
            duration: 900,
            easing: 'easeOutQuart'
          },
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { size: 10, weight: '600' } },
              beginAtZero: true
            },
            y: {
              grid: { display: false },
              ticks: { color: textColor, font: { size: 10, weight: 'bold' } }
            }
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, font: { size: 10, weight: 'bold' }, boxWidth: 12 }
            }
          }
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  // HER BİR DERSİN AYRINTILI ANALİZ KARTLARI (9 DERS DÖKÜMÜ)
  // -------------------------------------------------------------------------
  focusSubjectAnalysis(subjectId) {
    this.setDenemeChartFilter(subjectId);
    const chartEl = document.getElementById('denemeNetChart');
    if (chartEl) {
      chartEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const subObj = this.denemeSubjects.find(s => s.id === subjectId);
    this.showToast(`${subObj ? subObj.name : subjectId} gelişim grafiğine odaklanıldı 📈`, 'fa-arrow-trend-up', 'text-indigo-500');
  }

  renderDenemeSubjectCards(subjectStats) {
    const grid = document.getElementById('deneme-subject-cards-grid');
    if (!grid) return;

    grid.innerHTML = this.denemeSubjects.map(sub => {
      const stat = subjectStats[sub.id];

      // Evaluation Badge
      let evalBadge = { label: 'Veri Bekleniyor', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-500' };
      if (stat.examCount > 0) {
        if (stat.successRate >= 78) {
          evalBadge = { label: 'Zirvede ⭐⭐⭐', bg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' };
        } else if (stat.successRate >= 65) {
          evalBadge = { label: 'Çok İyi ⭐⭐', bg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800' };
        } else if (stat.successRate >= 48) {
          evalBadge = { label: 'Gelişime Açık 📈', bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800' };
        } else {
          evalBadge = { label: 'Öncelikli Tekrar ⚠️', bg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800' };
        }
      }

      // Progress bar color
      let barBg = 'bg-slate-300 dark:bg-slate-700';
      let rateColor = 'text-slate-400';
      if (stat.examCount > 0) {
        if (stat.successRate >= 75) {
          barBg = 'bg-emerald-500';
          rateColor = 'text-emerald-600 dark:text-emerald-400';
        } else if (stat.successRate >= 60) {
          barBg = 'bg-indigo-500';
          rateColor = 'text-indigo-600 dark:text-indigo-400';
        } else if (stat.successRate >= 45) {
          barBg = 'bg-amber-500';
          rateColor = 'text-amber-600 dark:text-amber-400';
        } else {
          barBg = 'bg-rose-500';
          rateColor = 'text-rose-600 dark:text-rose-400';
        }
      }

      // Trend delta indicator for latest net
      let trendHtml = '';
      if (stat.trendDelta !== null) {
        if (stat.trendDelta > 0) {
          trendHtml = `<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center ml-1" title="Önceki denemeye göre +${stat.trendDelta} Net"><i class="fa-solid fa-caret-up mr-0.5"></i>+${stat.trendDelta}</span>`;
        } else if (stat.trendDelta < 0) {
          trendHtml = `<span class="text-[10px] text-rose-500 font-extrabold flex items-center ml-1" title="Önceki denemeye göre ${stat.trendDelta} Net"><i class="fa-solid fa-caret-down mr-0.5"></i>${stat.trendDelta}</span>`;
        }
      }

      return `
        <div class="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 hover:border-indigo-300 dark:hover:border-indigo-700 group space-y-3">
          
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center space-x-2.5 truncate">
              <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${sub.color} text-lg shrink-0">
                <i class="fa-solid ${sub.icon}"></i>
              </div>
              <div class="truncate">
                <h4 class="font-extrabold text-sm text-slate-900 dark:text-white leading-tight truncate" title="${sub.name}">${sub.name}</h4>
                <span class="text-[11px] text-slate-400 font-medium">${stat.examCount} Denemede Yer Aldı</span>
              </div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 ${evalBadge.bg}">
              ${evalBadge.label}
            </span>
          </div>

          <!-- Metrics Box -->
          <div class="grid grid-cols-3 gap-1.5 text-center">
            <div class="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
              <div class="text-[10px] text-slate-400 font-semibold">Ort. Net</div>
              <div class="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">${stat.avgNet.toFixed(2)}</div>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
              <div class="text-[10px] text-slate-400 font-semibold">Son Sınav</div>
              <div class="text-base font-black text-slate-900 dark:text-white mt-0.5 flex items-center justify-center">
                <span>${stat.latestNet.toFixed(2)}</span>
                ${trendHtml}
              </div>
            </div>
            <div class="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
              <div class="text-[10px] text-slate-400 font-semibold">Zirve Net</div>
              <div class="text-base font-black text-amber-500 mt-0.5">${stat.maxNet.toFixed(2)} 🏆</div>
            </div>
          </div>

          <!-- Animated Glowing Progress Bar -->
          <div class="space-y-1">
            <div class="flex justify-between text-xs font-bold">
              <span class="text-slate-500 text-[11px]">Başarı Oranı</span>
              <span class="${rateColor} font-extrabold">%${stat.successRate}</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div class="${barBg} h-full rounded-full transition-all duration-1000 shimmer-bar" style="width: ${stat.successRate}%"></div>
            </div>
          </div>

          <!-- Footer Info & Focus Action -->
          <div class="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span class="text-slate-500 dark:text-slate-400 font-medium">
              Ort: <b class="text-emerald-600">${stat.avgD}D</b> • <b class="text-rose-500">${stat.avgY}Y</b> • <b class="text-slate-400">${stat.avgB}B</b>
            </span>
            <button onclick="appEngine.focusSubjectAnalysis('${sub.id}')" class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-extrabold flex items-center space-x-1 transition active:scale-95">
              <span>Trendi Gör</span>
              <i class="fa-solid fa-arrow-trend-up text-[10px]"></i>
            </button>
          </div>

        </div>
      `;
    }).join('');
  }

  // -------------------------------------------------------------------------
  // ÖRNEK DENEME YÜKLEME / KALDIRMA (CANLI GRAFİK DENEYİMİ İÇİN)
  // -------------------------------------------------------------------------
  toggleSampleDenemeData() {
    const hasSample = (this.state.denemeler || []).some(d => d.isSample);
    if (hasSample) {
      if (!confirm("Yüklenmiş olan örnek deneme sınavları kaldırılsın mı?")) return;
      this.state.denemeler = (this.state.denemeler || []).filter(d => !d.isSample);
      this.saveState();
      this.renderDenemelerView();
      this.showToast('Örnek denemeler temizlendi', 'fa-trash-can', 'text-slate-400');
      return;
    }

    const sampleExams = [
      {
        id: `sample-deneme-1`,
        name: "1. Kurumsal TYT Başlangıç",
        date: "2026-10-04",
        notes: "Dönem başı seviye tespit sınavı. Matematik süre yönetimi geliştirilmeli.",
        isSample: true,
        subjects: {
          turkce: { q: 30, d: 20, y: 6, b: 4, net: 18.50 },
          matematik: { q: 30, d: 18, y: 4, b: 8, net: 17.00 },
          fizik: { q: 10, d: 5, y: 3, b: 2, net: 4.25 },
          kimya: { q: 10, d: 6, y: 2, b: 2, net: 5.50 },
          biyoloji: { q: 10, d: 5, y: 2, b: 3, net: 4.50 },
          tarih: { q: 10, d: 4, y: 2, b: 4, net: 3.50 },
          cografya: { q: 10, d: 3, y: 2, b: 5, net: 2.50 },
          din_felsefe: { q: 5, d: 2, y: 1, b: 2, net: 1.75 },
          ingilizce: { q: 10, d: 2, y: 4, b: 4, net: 1.00 }
        },
        totalQ: 115,
        totalD: 65,
        totalY: 26,
        totalB: 24,
        totalNet: 58.50,
        timestamp: "2026-10-04T12:00:00.000Z"
      },
      {
        id: `sample-deneme-2`,
        name: "2. Özdebir Türkiye Geneli",
        date: "2026-10-12",
        notes: "Matematik ve Türkçede belirgin artış var. Fen sorularında dikkat hataları azaldı.",
        isSample: true,
        subjects: {
          turkce: { q: 30, d: 22, y: 4, b: 4, net: 21.00 },
          matematik: { q: 30, d: 21, y: 3, b: 6, net: 20.25 },
          fizik: { q: 10, d: 6, y: 2, b: 2, net: 5.50 },
          kimya: { q: 10, d: 6, y: 1, b: 3, net: 5.75 },
          biyoloji: { q: 10, d: 6, y: 2, b: 2, net: 5.50 },
          tarih: { q: 10, d: 5, y: 2, b: 3, net: 4.50 },
          cografya: { q: 10, d: 3, y: 1, b: 6, net: 2.75 },
          din_felsefe: { q: 5, d: 2, y: 0, b: 3, net: 2.00 },
          ingilizce: { q: 10, d: 0, y: 0, b: 10, net: 0.00 }
        },
        totalQ: 115,
        totalD: 71,
        totalY: 15,
        totalB: 29,
        totalNet: 67.25,
        timestamp: "2026-10-12T12:00:00.000Z"
      },
      {
        id: `sample-deneme-3`,
        name: "3. Hız & Renk 9. Sınıf Başarı Denemesi",
        date: "2026-10-19",
        notes: "Zirve net! Matematikte 24.5 nete ulaşıldı. Fen ve Sosyal dengeli yükseliyor.",
        isSample: true,
        subjects: {
          turkce: { q: 30, d: 24, y: 3, b: 3, net: 23.25 },
          matematik: { q: 30, d: 25, y: 2, b: 3, net: 24.50 },
          fizik: { q: 10, d: 7, y: 1, b: 2, net: 6.75 },
          kimya: { q: 10, d: 7, y: 2, b: 1, net: 6.50 },
          biyoloji: { q: 10, d: 6, y: 1, b: 3, net: 5.75 },
          tarih: { q: 10, d: 5, y: 1, b: 4, net: 4.75 },
          cografya: { q: 10, d: 4, y: 1, b: 5, net: 3.75 },
          din_felsefe: { q: 5, d: 3, y: 1, b: 1, net: 2.75 },
          ingilizce: { q: 10, d: 0, y: 0, b: 10, net: 0.00 }
        },
        totalQ: 115,
        totalD: 81,
        totalY: 12,
        totalB: 22,
        totalNet: 78.00,
        timestamp: "2026-10-19T12:00:00.000Z"
      }
    ];

    if (!this.state.denemeler) this.state.denemeler = [];
    this.state.denemeler.push(...sampleExams);
    this.saveState();
    this.confettiCelebration();
    this.renderDenemelerView();
    this.showToast('3 örnek deneme sınavı başarıyla yüklendi! 📊', 'fa-wand-magic-sparkles', 'text-amber-500');
  }

  // TAB 4: BOOKS
  renderBooksView() {
    let mbCount = 0;
    let orjCount = 0;
    let mbDone = 0;
    let orjDone = 0;

    this.schedule.forEach(t => {
      const isDone = !!this.state.completedTasks[t.id];
      if (t.book.includes('MatBook')) {
        mbCount++;
        if (isDone) mbDone++;
      } else {
        orjCount++;
        if (isDone) orjDone++;
      }
    });

    const mbPct = Math.round((mbDone / (mbCount || 1)) * 100);
    const orjPct = Math.round((orjDone / (orjCount || 1)) * 100);

    const mbPctEl = document.getElementById('matbook-progress-pct');
    if (mbPctEl) mbPctEl.textContent = `%${mbPct} (${mbDone}/${mbCount})`;
    const mbBar = document.getElementById('matbook-progress-bar');
    if (mbBar) mbBar.style.width = `${mbPct}%`;

    const orjPctEl = document.getElementById('orijinal-progress-pct');
    if (orjPctEl) orjPctEl.textContent = `%${orjPct} (${orjDone}/${orjCount})`;
    const orjBar = document.getElementById('orijinal-progress-bar');
    if (orjBar) orjBar.style.width = `${orjPct}%`;

    const accordionContainer = document.getElementById('themes-accordion-container');
    if (accordionContainer) {
      const themesMap = {};
      this.schedule.forEach(t => {
        if (!themesMap[t.theme]) {
          themesMap[t.theme] = { total: 0, done: 0, tests: 0, acts: 0 };
        }
        themesMap[t.theme].total++;
        if (t.type === 'etkinlik') themesMap[t.theme].acts++;
        else themesMap[t.theme].tests++;
        if (this.state.completedTasks[t.id]) themesMap[t.theme].done++;
      });

      accordionContainer.innerHTML = Object.keys(themesMap).map(themeName => {
        const d = themesMap[themeName];
        const pct = Math.round((d.done / d.total) * 100);
        return `
          <div class="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200">${themeName}</div>
              <div class="text-[11px] text-slate-400 mt-0.5">${d.total} Görev (${d.acts} Etkinlik + ${d.tests} Test)</div>
            </div>
            <div class="text-right">
              <span class="text-xs font-black text-brand-600 dark:text-brand-400">%${pct}</span>
              <div class="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                <div class="bg-brand-600 h-1.5 rounded-full" style="width: ${pct}%"></div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // TAB 5: DİJİTAL YANLIŞ VE BOŞ DEFTERİ (WRONG & BLANK NOTEBOOK)
  filterQuestions(filter) {
    this.qFilter = filter;
    document.querySelectorAll('[data-q-filter]').forEach(b => {
      const isTarget = b.getAttribute('data-q-filter') === filter;
      if (isTarget) {
        if (filter === 'yanlis') {
          b.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white transition shadow-sm';
        } else if (filter === 'bos') {
          b.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white transition shadow-sm';
        } else {
          b.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white transition shadow-sm';
        }
      } else {
        b.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition';
      }
    });
    this.renderQuestionsView();
  }

  toggleQuestionType(id) {
    const q = (this.state.questions || []).find(x => x.id === id);
    if (q) {
      q.type = (q.type === 'bos' ? 'yanlis' : 'bos');
      this.saveState();
      this.renderQuestionsView();
      this.showToast(q.type === 'bos' ? 'Soru "Boş Soru" olarak güncellendi' : 'Soru "Yanlış Soru" olarak güncellendi', 'fa-tag', 'text-indigo-500');
    }
  }

  renderQuestionsView() {
    const container = document.getElementById('questions-grid-container');
    if (!container) return;

    // 1. Calculate Comprehensive Statistics
    let totalWrong = 0;
    let totalEmpty = 0;
    const wrongTests = [];

    for (const taskId in (this.state.testResults || {})) {
      const res = this.state.testResults[taskId];
      if (!res.isActivity) {
        const w = res.wrong || 0;
        const e = res.empty || 0;
        totalWrong += w;
        totalEmpty += e;

        if (w > 0 || e > 0) {
          const task = this.schedule.find(s => s.id === taskId);
          if (task) {
            wrongTests.push({ task, res });
          }
        }
      }
    }

    const allQuestions = this.state.questions || [];
    const photoWrongCount = allQuestions.filter(q => (q.type || 'yanlis') === 'yanlis').length;
    const photoEmptyCount = allQuestions.filter(q => q.type === 'bos').length;
    const totalPhotos = allQuestions.length;
    const totalPending = allQuestions.filter(q => !q.solved).length;

    // Update Stat Elements
    const elWrong = document.getElementById('notebook-stat-wrong');
    if (elWrong) elWrong.innerHTML = `${totalWrong} <span class="text-xs font-semibold text-rose-500/80">(${photoWrongCount} Foto)</span>`;

    const elEmpty = document.getElementById('notebook-stat-empty');
    if (elEmpty) elEmpty.innerHTML = `${totalEmpty} <span class="text-xs font-semibold text-amber-500/80">(${photoEmptyCount} Foto)</span>`;

    const elPhotos = document.getElementById('notebook-stat-photos');
    if (elPhotos) elPhotos.textContent = `${totalPhotos} Soru`;

    const elPending = document.getElementById('notebook-stat-pending');
    if (elPending) elPending.textContent = `${totalPending} Soru`;

    const bannerBadge = document.getElementById('banner-yanlis-badge');
    if (bannerBadge) {
      bannerBadge.textContent = `${totalWrong} Yanlış • ${totalEmpty} Boş`;
    }
    const wrongCountEl = document.getElementById('banner-count-wrong');
    if (wrongCountEl) wrongCountEl.textContent = `${totalWrong} Yanlış`;
    const emptyCountEl = document.getElementById('banner-count-empty');
    if (emptyCountEl) emptyCountEl.textContent = `${totalEmpty} Boş`;
    const photoCountEl = document.getElementById('banner-count-photo');
    if (photoCountEl) photoCountEl.textContent = `${totalPhotos} Fotoğraflı`;

    // 2. Filter Questions
    let filteredQuestions = allQuestions;
    if (this.qFilter === 'yanlis') {
      filteredQuestions = allQuestions.filter(q => (q.type || 'yanlis') === 'yanlis');
    } else if (this.qFilter === 'bos') {
      filteredQuestions = allQuestions.filter(q => q.type === 'bos');
    } else if (this.qFilter === 'unsolved') {
      filteredQuestions = allQuestions.filter(q => !q.solved);
    } else if (this.qFilter === 'solved') {
      filteredQuestions = allQuestions.filter(q => q.solved);
    }

    let filteredWrongTests = wrongTests;
    if (this.qFilter === 'yanlis') {
      filteredWrongTests = wrongTests.filter(({ res }) => (res.wrong || 0) > 0);
    } else if (this.qFilter === 'bos') {
      filteredWrongTests = wrongTests.filter(({ res }) => (res.empty || 0) > 0);
    }

    const showPhotos = (this.qFilter !== 'tests');
    const showTests = (this.qFilter === 'all' || this.qFilter === 'tests' || this.qFilter === 'yanlis' || this.qFilter === 'bos');

    let html = '';

    // SECTION A: Fotoğraflı Özel Soru Havuzu
    if (showPhotos && filteredQuestions.length > 0) {
      const sectionTitle = this.qFilter === 'yanlis' 
        ? 'Yanlış Olarak Etiketlenen Sorular' 
        : (this.qFilter === 'bos' ? 'Boş Bırakılan Sorular' : 'Fotoğraflı Soru Havuzu');

      html += `
        <div class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <h3 class="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <i class="fa-solid fa-camera text-indigo-600 dark:text-indigo-400"></i>
              <span>${sectionTitle} (${filteredQuestions.length})</span>
            </h3>
            <span class="text-xs text-slate-400">Etikete tıklayarak Yanlış / Boş değiştirebilirsiniz</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${filteredQuestions.slice().reverse().map(q => {
              const isBos = (q.type === 'bos');
              const typeBadge = isBos
                ? `<button onclick="appEngine.toggleQuestionType('${q.id}')" title="Tıkla: Yanlış Soru Yap" class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center space-x-1 hover:scale-105 transition cursor-pointer">
                     <i class="fa-solid fa-circle-question"></i>
                     <span>Boş Soru</span>
                   </button>`
                : `<button onclick="appEngine.toggleQuestionType('${q.id}')" title="Tıkla: Boş Soru Yap" class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center space-x-1 hover:scale-105 transition cursor-pointer">
                     <i class="fa-solid fa-circle-xmark"></i>
                     <span>Yanlış Soru</span>
                   </button>`;

              const solvedBadge = `
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${q.solved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">
                  ${q.solved ? '✅ Çözüldü' : '⏳ Bekliyor'}
                </span>
              `;

              return `
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3 flex flex-col justify-between hover:shadow-md transition">
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-1.5">
                        ${typeBadge}
                        ${solvedBadge}
                      </div>
                      <span class="text-[11px] font-medium text-slate-400">${q.date || ''}</span>
                    </div>

                    ${q.imageBase64 ? `
                      <div class="w-full h-48 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700/60 cursor-pointer group relative" onclick="appEngine.viewImageModal('${q.imageBase64}')">
                        <img src="${q.imageBase64}" alt="Soru" class="w-full h-full object-contain group-hover:scale-105 transition">
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold space-x-1.5">
                          <i class="fa-solid fa-magnifying-glass-plus"></i>
                          <span>Büyüt</span>
                        </div>
                      </div>
                    ` : ''}

                    <div>
                      <div class="text-xs font-extrabold text-slate-900 dark:text-white">${q.book} • ${q.title}</div>
                      ${q.note ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 italic bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">"${q.note}"</p>` : ''}
                    </div>
                  </div>

                  <div class="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <button onclick="appEngine.toggleQuestionSolved('${q.id}')" class="text-xs font-bold ${q.solved ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'} transition flex items-center space-x-1">
                      <i class="fa-solid ${q.solved ? 'fa-rotate-left' : 'fa-circle-check'}"></i>
                      <span>${q.solved ? 'Bekliyor Yap' : 'Çözüldü Olarak İşaretle'}</span>
                    </button>
                    
                    <button onclick="appEngine.deleteQuestion('${q.id}')" title="Sil" class="text-xs text-slate-400 hover:text-rose-500 transition px-2 py-1">
                      <i class="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // SECTION B: Yanlış & Boş Yapılan Testler
    if (showTests && filteredWrongTests.length > 0) {
      html += `
        <div class="space-y-3 pt-3">
          <div class="flex items-center justify-between px-1">
            <h3 class="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <i class="fa-solid fa-clipboard-list text-rose-600 dark:text-rose-400"></i>
              <span>Yanlış ve Boş İçeren Testler (${filteredWrongTests.length})</span>
            </h3>
            <span class="text-xs text-slate-400">Ödevlerde takılınan test dökümü</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${filteredWrongTests.map(({ task, res }) => `
              <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition">
                <div class="space-y-1">
                  <div class="flex items-center space-x-2">
                    <span class="text-[11px] font-bold text-slate-400">#${task.id.replace('task-', '')}</span>
                    <span class="text-xs font-bold text-slate-900 dark:text-white">${task.book}</span>
                    <span class="text-xs text-slate-400">• ${task.pages}</span>
                  </div>
                  <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-xs">${task.title}</h4>
                  <div class="flex items-center space-x-3 text-xs pt-0.5">
                    <span class="font-extrabold text-rose-600 dark:text-rose-400">❌ ${res.wrong || 0} Yanlış</span>
                    <span class="font-extrabold text-slate-500">⚪ ${res.empty || 0} Boş</span>
                    <span class="font-black text-blue-600 dark:text-blue-400">${res.net} Net</span>
                  </div>
                </div>

                <button onclick="appEngine.openUploadQuestionModalForTask('${task.id}')" class="shrink-0 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center space-x-1.5 transition">
                  <i class="fa-solid fa-camera"></i>
                  <span>Soru Ekle</span>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (!html) {
      container.innerHTML = `
        <div class="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-slate-400 space-y-3">
          <div class="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl mx-auto">
            <i class="fa-solid fa-book-open"></i>
          </div>
          <div>
            <h4 class="text-base font-bold text-slate-700 dark:text-slate-300">Bu Kriterde Soru Bulunmuyor</h4>
            <p class="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              ${this.qFilter === 'yanlis' ? 'Henüz yanlış olarak etiketlenmiş bir soru yok.' : (this.qFilter === 'bos' ? 'Henüz boş bırakılmış olarak etiketlenmiş bir soru yok.' : 'Ödevleri çözerken takıldığınız soruları "Soru Fotoğrafı Çek & Yükle" butonuyla buraya ekleyebilirsiniz.')}
            </p>
          </div>
          <button onclick="appEngine.openUploadQuestionModal('${this.qFilter === 'bos' ? 'bos' : 'yanlis'}')" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition">
            <i class="fa-solid fa-camera mr-1"></i> ${this.qFilter === 'bos' ? 'Boş Soru Fotoğrafı Çek' : 'Yeni Soru Fotoğrafı Çek'}
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = html;
  }

  // -------------------------------------------------------------------------
  // PDF Soru Kitapçığı Oluştur & Yazdır (Print Engine)
  // -------------------------------------------------------------------------
  printPdfNotebook() {
    const questions = this.state.questions || [];
    
    const wrongTests = [];
    for (const taskId in (this.state.testResults || {})) {
      const res = this.state.testResults[taskId];
      if (!res.isActivity && ((res.wrong || 0) > 0 || (res.empty || 0) > 0)) {
        const task = this.schedule.find(s => s.id === taskId);
        if (task) wrongTests.push({ task, res });
      }
    }

    if (questions.length === 0 && wrongTests.length === 0) {
      alert("Henüz defterde kayıtlı soru veya yanlış/boş yapılan test bulunmuyor.\nLütfen önce günlük ödevlerden takıldığınız soruların fotoğrafını ekleyin.");
      return;
    }

    const printContainer = document.getElementById('print-notebook-container');
    if (!printContainer) return;

    const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const totalItems = questions.length + wrongTests.length;

    let itemsHtml = '';
    let questionIndex = 1;

    // Render Photographed Questions
    questions.forEach((q) => {
      const isBos = (q.type === 'bos');
      itemsHtml += `
        <div class="print-question-card" style="page-break-inside: avoid; break-inside: avoid; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 16px; margin-bottom: 24px; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: #1e3a8a; color: #ffffff; padding: 3px 10px; border-radius: 6px; font-size: 13px; font-weight: 900;">SORU ${questionIndex}</span>
              <span style="background: ${isBos ? '#d97706' : '#e11d48'}; color: #ffffff; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 800;">
                ${isBos ? '⚪ BOŞ SORU' : '❌ YANLIŞ SORU'}
              </span>
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${q.book} • ${q.title}</span>
            </div>
            <span style="font-size: 11px; color: #64748b; font-weight: 600;">Tarih: ${q.date || todayStr}</span>
          </div>

          ${q.note ? `
            <div style="background: #f8fafc; border-left: 3px solid #3b82f6; padding: 6px 10px; font-size: 11px; color: #334155; margin-bottom: 12px; font-style: italic;">
              <b>Öğrenci Notu:</b> "${q.note}"
            </div>
          ` : ''}

          <div style="display: flex; gap: 16px; align-items: flex-start;">
            ${q.imageBase64 ? `
              <div style="flex: 1; max-width: 55%; text-align: center;">
                <img src="${q.imageBase64}" style="max-width: 100%; max-height: 280px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 8px;" alt="Soru ${questionIndex}">
              </div>
            ` : ''}

            <!-- Kareli Çözüm Çalışma Alanı -->
            <div style="flex: 1; min-height: 220px; border: 1.5px dashed #94a3b8; border-radius: 8px; padding: 10px; background-image: linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px); background-size: 5mm 5mm; position: relative;">
              <span style="position: absolute; top: 6px; right: 10px; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">ÇÖZÜM ALANI</span>
            </div>
          </div>
        </div>
      `;
      questionIndex++;
    });

    // Render Wrong Tests
    wrongTests.forEach(({ task, res }) => {
      itemsHtml += `
        <div class="print-question-card" style="page-break-inside: avoid; break-inside: avoid; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 16px; margin-bottom: 24px; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: #e11d48; color: #ffffff; padding: 3px 10px; border-radius: 6px; font-size: 13px; font-weight: 900;">TEKRAR TESTİ ${questionIndex}</span>
              <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${task.book} • ${task.pages} (${task.title})</span>
            </div>
            <span style="font-size: 11px; color: #e11d48; font-weight: 800;">${res.wrong} Yanlış • ${res.empty} Boş</span>
          </div>

          <div style="font-size: 12px; color: #475569; margin-bottom: 12px;">
            <b>Konu:</b> ${task.theme} • ${task.subtopic}
            ${res.notes ? `<br><b>Not:</b> "${res.notes}"` : ''}
          </div>

          <!-- Kareli Çözüm Çalışma Alanı -->
          <div style="min-height: 150px; border: 1.5px dashed #94a3b8; border-radius: 8px; padding: 10px; background-image: linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px); background-size: 5mm 5mm; position: relative;">
            <span style="position: absolute; top: 6px; right: 10px; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">TEKRAR VE ANALİZ ÇÖZÜM ALANI</span>
          </div>
        </div>
      `;
      questionIndex++;
    });

    printContainer.innerHTML = `
      <div style="padding: 10px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        
        <!-- Header -->
        <div style="border-bottom: 3px solid #1e3a8a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 1px;">ÖZEL MATEMATİK PEKİŞTİRME & ANALİZ KİTAPÇIĞI</div>
            <h1 style="font-size: 22px; font-weight: 900; color: #0f172a; margin: 4px 0 2px 0;">DENİZ — 9. SINIF MATEMATİK DİJİTAL YANLIŞ VE BOŞ DEFTERİ</h1>
            <div style="font-size: 12px; color: #475569;">2026 Türkiye Yüzyılı Maarif Modeli Müfredatı</div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #334155;">
            <div><b>Öğretmen:</b> Müfit Hızarcı</div>
            <div><b>Tarih:</b> ${todayStr}</div>
            <div><b>Toplam:</b> ${totalItems} Soru / Test</div>
          </div>
        </div>

        <!-- Questions List -->
        <div>
          ${itemsHtml}
        </div>

        <!-- Footer -->
        <div style="margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 11px; color: #64748b;">
          Deniz 9. Sınıf Matematik & Deneme Takip Portalı • Müfit Hızarcı
        </div>

      </div>
    `;

    // Trigger Print
    window.print();
  }

  viewImageModal(base64) {
    let modal = document.getElementById('modal-image-viewer');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'modal-image-viewer';
      modal.className = 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer';
      modal.onclick = () => modal.classList.add('hidden');
      modal.innerHTML = `
        <div class="relative max-w-3xl max-h-[90vh] bg-transparent">
          <img id="modal-image-viewer-img" src="" class="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain mx-auto">
          <div class="text-center text-white text-xs font-bold mt-2">Kapatmak için ekrana tıklayın</div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    document.getElementById('modal-image-viewer-img').src = base64;
    modal.classList.remove('hidden');
  }

  // TAB 6: BADGES
  renderBadgesView() {
    const container = document.getElementById('badges-grid-container');
    if (!container) return;

    const currentXp = this.state.xp || 0;
    const completedCount = Object.keys(this.state.completedTasks || {}).length;
    const streak = this.state.streak || 0;
    const denemeCount = (this.state.denemeler || []).length;

    let unlockedCount = 0;

    container.innerHTML = this.badges.map(b => {
      let isUnlocked = false;
      if (b.id === 'first_step' && completedCount >= 1) isUnlocked = true;
      if (b.id === 'streak_3' && streak >= 3) isUnlocked = true;
      if (b.id === 'streak_7' && streak >= 7) isUnlocked = true;
      if (b.id === 'first_activity' && Object.values(this.state.testResults || {}).some(r => r.isActivity)) isUnlocked = true;
      if (b.id === 'first_deneme' && denemeCount >= 1) isUnlocked = true;
      if (b.id === 'halfway_hero' && completedCount >= 100) isUnlocked = true;
      if (b.id === 'marathon_champion' && completedCount >= this.schedule.length) isUnlocked = true;
      if (b.id === 'math_wizard' && Object.values(this.state.testResults || {}).some(r => (r.net || 0) >= 10)) isUnlocked = true;

      if (isUnlocked) unlockedCount++;

      return `
        <div class="p-4 rounded-2xl border transition ${isUnlocked ? 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 shadow-md' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'} flex items-start space-x-3.5">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${isUnlocked ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400' : 'bg-slate-200 text-slate-400 dark:bg-slate-800'}">
            <i class="fa-solid ${b.icon}"></i>
          </div>
          <div>
            <div class="flex items-center space-x-1.5">
              <h4 class="text-sm font-bold text-slate-900 dark:text-white">${b.title}</h4>
              ${isUnlocked ? '<i class="fa-solid fa-circle-check text-amber-500 text-xs"></i>' : ''}
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${b.desc}</p>
            <div class="flex items-center space-x-2 mt-2 text-[10px] font-bold">
              <span class="text-purple-600 dark:text-purple-400">+${b.xp} XP</span>
              <span class="text-slate-400">• Koşul: ${b.req}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    document.getElementById('badges-unlocked-count').textContent = `${unlockedCount} / ${this.badges.length}`;
    
    const level = Math.floor(currentXp / 500) + 1;
    const levelXp = currentXp % 500;
    const levelPct = Math.min(100, Math.round((levelXp / 500) * 100));

    const rankTitles = ["Çırak Matematikçi", "Kavrayan Kaşif", "Problem Avcısı", "Soru Ustası", "Geometri Mimarı", "Matematik Şampiyonu"];
    const rankTitle = rankTitles[Math.min(level - 1, rankTitles.length - 1)];

    document.getElementById('student-rank-title').textContent = `Seviye ${level}: ${rankTitle}`;
    document.getElementById('student-level-xp').textContent = `${levelXp} / 500 XP`;
    document.getElementById('student-xp-bar').style.width = `${levelPct}%`;
  }

  // TAB 7: SETTINGS
  renderSettingsView() {
    const scriptInput = document.getElementById('setting-script-url');
    if (scriptInput) scriptInput.value = this.state.cloudSettings.scriptUrl || '';

    const teacherInput = document.getElementById('setting-teacher-email');
    if (teacherInput) teacherInput.value = this.state.cloudSettings.teacherEmail || 'hizarci84@gmail.com';

    const parentInput = document.getElementById('setting-parent-emails');
    if (parentInput) parentInput.value = this.state.cloudSettings.parentEmails || '';
  }

  saveSettings() {
    this.state.cloudSettings.scriptUrl = (document.getElementById('setting-script-url')?.value || '').trim();
    this.state.cloudSettings.teacherEmail = (document.getElementById('setting-teacher-email')?.value || '').trim();
    this.state.cloudSettings.parentEmails = (document.getElementById('setting-parent-emails')?.value || '').trim();
    this.saveState();
    this.showToast('Ayarlar başarıyla kaydedildi!', 'fa-check', 'text-emerald-500');
  }

  // -------------------------------------------------------------------------
  // SETTINGS PASSWORD PROTECTION (VELİ & ÖĞRETMEN KORUMASI - PIN: 2026)
  // -------------------------------------------------------------------------
  openSettingsPasswordModal() {
    const modal = document.getElementById('modal-settings-password');
    const input = document.getElementById('settings-password-input');
    const error = document.getElementById('settings-password-error');
    if (!modal) return;
    if (input) {
      input.value = '';
      input.type = 'password';
    }
    const eyeIcon = document.getElementById('settings-password-eye-icon');
    if (eyeIcon) {
      eyeIcon.className = 'fa-solid fa-eye';
    }
    if (error) error.classList.add('hidden');
    modal.classList.remove('hidden');
    if (input) {
      setTimeout(() => input.focus(), 120);
    }
  }

  closeSettingsPasswordModal() {
    const modal = document.getElementById('modal-settings-password');
    if (modal) modal.classList.add('hidden');
    const input = document.getElementById('settings-password-input');
    if (input) input.value = '';
    const error = document.getElementById('settings-password-error');
    if (error) error.classList.add('hidden');
  }

  toggleSettingsPasswordVisibility() {
    const input = document.getElementById('settings-password-input');
    const eyeIcon = document.getElementById('settings-password-eye-icon');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye-slash';
    } else {
      input.type = 'password';
      if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye';
    }
  }

  submitSettingsPassword() {
    const input = document.getElementById('settings-password-input');
    const error = document.getElementById('settings-password-error');
    const card = document.getElementById('modal-settings-card');
    const val = input ? input.value.trim() : '';

    if (val === this.SETTINGS_PASSWORD) {
      this.isSettingsUnlocked = true;
      this.closeSettingsPasswordModal();
      this.switchTab('settings');
      this.showToast('Ayarlar kilidi açıldı 🔓', 'fa-unlock', 'text-amber-500');
    } else {
      if (error) error.classList.remove('hidden');
      if (card) {
        card.classList.remove('animate-shake');
        void card.offsetWidth; // force DOM reflow
        card.classList.add('animate-shake');
      }
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  }

  lockSettings() {
    this.isSettingsUnlocked = false;
    this.switchTab('today');
    this.showToast('Ayarlar kilitlendi 🔒', 'fa-lock', 'text-amber-500');
  }

  // -------------------------------------------------------------------------
  // MODAL 1: TASK RESULT ENTRY
  // -------------------------------------------------------------------------
  openTaskModal(taskId) {
    this.activeModalTaskId = taskId;
    const task = this.schedule.find(s => s.id === taskId);
    if (!task) return;

    const modal = document.getElementById('modal-task-result');
    const isActivity = (task.type === 'etkinlik');

    document.getElementById('modal-type-badge').textContent = isActivity ? '2 SAYFA ETKİNLİK VERİ GİRİŞİ' : 'TEST SONUCU VERİ GİRİŞİ';
    document.getElementById('modal-task-title').textContent = task.title;
    document.getElementById('modal-task-subtitle').textContent = `${task.book} • ${task.pages} (${task.subtopic})`;

    const testSection = document.getElementById('modal-test-section');
    const actSection = document.getElementById('modal-activity-section');

    const existingResult = this.state.testResults[taskId] || null;

    if (testSection) testSection.classList.remove('hidden');
    if (actSection) actSection.classList.add('hidden');

    document.getElementById('input-correct').value = existingResult ? (existingResult.correct ?? '') : '';
    document.getElementById('input-wrong').value = existingResult ? (existingResult.wrong ?? '') : '';
    document.getElementById('input-empty').value = existingResult ? (existingResult.empty ?? '') : '';
    document.getElementById('input-duration').value = existingResult ? (existingResult.duration || 20) : 20;
    this.calcModalNet();

    document.getElementById('input-task-notes').value = existingResult ? (existingResult.notes || '') : '';
    modal.classList.remove('hidden');
  }

  closeTaskModal() {
    const modal = document.getElementById('modal-task-result');
    if (modal) modal.classList.add('hidden');
    this.activeModalTaskId = null;
  }

  calcModalNet() {
    const c = parseFloat(document.getElementById('input-correct')?.value) || 0;
    const w = parseFloat(document.getElementById('input-wrong')?.value) || 0;
    const net = Math.max(0, c - (w / 4));
    const netDisplay = document.getElementById('modal-net-display');
    if (netDisplay) netDisplay.textContent = `${net.toFixed(2)} Net`;
  }

  saveTaskModalResult() {
    if (!this.activeModalTaskId) return;
    const task = this.schedule.find(s => s.id === this.activeModalTaskId);
    if (!task) return;

    const isActivity = (task.type === 'etkinlik');
    const notes = document.getElementById('input-task-notes')?.value || '';

    const c = parseInt(document.getElementById('input-correct')?.value) || 0;
    const w = parseInt(document.getElementById('input-wrong')?.value) || 0;
    const b = parseInt(document.getElementById('input-empty')?.value) || 0;
    const duration = parseInt(document.getElementById('input-duration')?.value) || 20;
    const net = Math.max(0, Math.round((c - (w / 4)) * 100) / 100);

    this.state.completedTasks[task.id] = true;
    this.state.testResults[task.id] = {
      isActivity: isActivity,
      totalQ: c + w + b,
      correct: c,
      wrong: w,
      empty: b,
      net: net,
      duration: duration,
      notes: notes,
      timestamp: new Date().toISOString()
    };
    if (this._cardEditingTasks) delete this._cardEditingTasks[task.id];

    const xpEarned = isActivity ? 50 : 100;
    this.addXp(xpEarned);
    this.updateStreak();
    this.confettiCelebration();
    this.showToast(`${isActivity ? 'Etkinlik' : 'Test'} kaydedildi: ${c}D ${w}Y ${b}B • ${net.toFixed(2)} Net! +${xpEarned} XP`, 'fa-circle-check', 'text-emerald-500');

    this.saveState();
    this.closeTaskModal();
    this.renderAllViews();
  }

  toggleTaskQuick(taskId) {
    if (this.state.completedTasks[taskId]) {
      delete this.state.completedTasks[taskId];
      delete this.state.testResults[taskId];
      if (this._cardEditingTasks) delete this._cardEditingTasks[taskId];
      this.showToast('Görev tamamlanmadı olarak işaretlendi', 'fa-rotate-left', 'text-slate-400');
    } else {
      this.openTaskModal(taskId);
      return;
    }
    this.saveState();
    this.renderAllViews();
  }

  // -------------------------------------------------------------------------
  // MODAL 2: DENEME SINAVI VERİ GİRİŞİ
  // -------------------------------------------------------------------------
  openNewDenemeModal() {
    document.getElementById('deneme-name').value = '';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('deneme-date').value = today;
    document.getElementById('deneme-notes').value = '';

    this.denemeSubjects.forEach(s => {
      const qEl = document.getElementById(`sub-q-${s.id}`);
      const dEl = document.getElementById(`sub-d-${s.id}`);
      const yEl = document.getElementById(`sub-y-${s.id}`);
      const bEl = document.getElementById(`sub-b-${s.id}`);
      const netEl = document.getElementById(`sub-net-${s.id}`);
      if (qEl) qEl.value = s.defaultQ || '';
      if (dEl) dEl.value = '';
      if (yEl) yEl.value = '';
      if (bEl) bEl.value = '';
      if (netEl) netEl.textContent = '0.00 N';
    });

    this.calcDenemeModalTotalNet();
    document.getElementById('modal-deneme').classList.remove('hidden');
  }

  closeDenemeModal() {
    document.getElementById('modal-deneme').classList.add('hidden');
  }

  calcDenemeModalTotalNet(changedSubjectId, changedField) {
    if (changedSubjectId && (changedField === 'd' || changedField === 'y' || changedField === 'q')) {
      const qVal = parseInt(document.getElementById(`sub-q-${changedSubjectId}`)?.value);
      const dVal = parseInt(document.getElementById(`sub-d-${changedSubjectId}`)?.value) || 0;
      const yVal = parseInt(document.getElementById(`sub-y-${changedSubjectId}`)?.value) || 0;
      const bEl = document.getElementById(`sub-b-${changedSubjectId}`);

      if (!isNaN(qVal) && qVal > 0 && bEl) {
        const calcB = Math.max(0, qVal - (dVal + yVal));
        bEl.value = calcB;
      }
    }

    let totalQ = 0;
    let totalD = 0;
    let totalY = 0;
    let totalB = 0;
    let totalNet = 0;

    this.denemeSubjects.forEach(s => {
      const q = parseInt(document.getElementById(`sub-q-${s.id}`)?.value) || 0;
      const d = parseFloat(document.getElementById(`sub-d-${s.id}`)?.value) || 0;
      const y = parseFloat(document.getElementById(`sub-y-${s.id}`)?.value) || 0;
      const b = parseFloat(document.getElementById(`sub-b-${s.id}`)?.value) || 0;
      const net = Math.max(0, d - (y / 4));

      totalQ += q;
      totalD += d;
      totalY += y;
      totalB += b;
      totalNet += net;

      const netEl = document.getElementById(`sub-net-${s.id}`);
      if (netEl) netEl.textContent = `${net.toFixed(2)} N`;
    });

    const totalDYEl = document.getElementById('deneme-total-d-y');
    if (totalDYEl) {
      totalDYEl.textContent = `${totalQ > 0 ? `${totalQ} Soru • ` : ''}${totalD} Doğru • ${totalY} Yanlış • ${totalB} Boş`;
    }
    const totalNetEl = document.getElementById('deneme-total-net-display');
    if (totalNetEl) {
      totalNetEl.textContent = `${totalNet.toFixed(2)} Net`;
    }
  }

  saveDenemeModalResult() {
    const name = (document.getElementById('deneme-name')?.value || '').trim();
    const date = document.getElementById('deneme-date')?.value || new Date().toISOString().split('T')[0];
    const notes = document.getElementById('deneme-notes')?.value || '';

    if (!name) {
      alert("Lütfen deneme sınavının adını veya yayınını giriniz.");
      return;
    }

    const subjects = {};
    let totalQ = 0;
    let totalD = 0;
    let totalY = 0;
    let totalB = 0;
    let totalNet = 0;

    this.denemeSubjects.forEach(s => {
      const q = parseInt(document.getElementById(`sub-q-${s.id}`)?.value) || 0;
      const d = parseInt(document.getElementById(`sub-d-${s.id}`)?.value) || 0;
      const y = parseInt(document.getElementById(`sub-y-${s.id}`)?.value) || 0;
      const b = parseInt(document.getElementById(`sub-b-${s.id}`)?.value) || 0;
      const net = Math.max(0, Math.round((d - (y / 4)) * 100) / 100);

      subjects[s.id] = { q, d, y, b, net };
      totalQ += q;
      totalD += d;
      totalY += y;
      totalB += b;
      totalNet += net;
    });

    const denemeEntry = {
      id: `deneme-${Date.now()}`,
      name: name,
      date: date,
      notes: notes,
      subjects: subjects,
      totalQ: totalQ,
      totalD: totalD,
      totalY: totalY,
      totalB: totalB,
      totalNet: Math.round(totalNet * 100) / 100,
      timestamp: new Date().toISOString()
    };

    if (!this.state.denemeler) this.state.denemeler = [];
    this.state.denemeler.push(denemeEntry);

    this.addXp(200);
    this.confettiCelebration();
    this.saveState();
    this.closeDenemeModal();
    this.renderDenemelerView();
    this.showToast(`Deneme sınavı kaydedildi: ${totalNet.toFixed(2)} Net! +200 XP`, 'fa-trophy', 'text-amber-500');
  }

  deleteDeneme(id) {
    if (!confirm("Bu deneme sınavı kaydını silmek istediğinize emin misiniz?")) return;
    this.state.denemeler = (this.state.denemeler || []).filter(d => d.id !== id);
    this.saveState();
    this.renderDenemelerView();
    this.showToast('Deneme sınavı silindi', 'fa-trash-can', 'text-slate-400');
  }

  // -------------------------------------------------------------------------
  // MODAL 3: QUESTION PHOTO UPLOAD
  // -------------------------------------------------------------------------
  selectQuestionType(type) {
    const yanlisBtn = document.getElementById('upload-q-type-btn-yanlis');
    const bosBtn = document.getElementById('upload-q-type-btn-bos');
    const yanlisRadio = document.getElementById('upload-q-type-yanlis');
    const bosRadio = document.getElementById('upload-q-type-bos');

    if (type === 'bos') {
      if (bosRadio) bosRadio.checked = true;
      if (bosBtn) {
        bosBtn.className = "flex items-center justify-center p-3 rounded-2xl border-2 cursor-pointer transition active:scale-95 border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20";
      }
      if (yanlisBtn) {
        yanlisBtn.className = "flex items-center justify-center p-3 rounded-2xl border-2 cursor-pointer transition active:scale-95 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
      }
    } else {
      if (yanlisRadio) yanlisRadio.checked = true;
      if (yanlisBtn) {
        yanlisBtn.className = "flex items-center justify-center p-3 rounded-2xl border-2 cursor-pointer transition active:scale-95 border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20";
      }
      if (bosBtn) {
        bosBtn.className = "flex items-center justify-center p-3 rounded-2xl border-2 cursor-pointer transition active:scale-95 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
      }
    }
  }

  openUploadQuestionModal(defaultType = 'yanlis') {
    this.currentUploadImageBase64 = null;
    const titleEl = document.getElementById('upload-q-title');
    if (titleEl) titleEl.value = '';
    const noteEl = document.getElementById('upload-q-note');
    if (noteEl) noteEl.value = '';
    this.clearQuestionImage();
    this.selectQuestionType(defaultType);
    document.getElementById('modal-upload-question')?.classList.remove('hidden');
  }

  openUploadQuestionModalForTask(taskId) {
    const task = this.schedule.find(s => s.id === taskId);
    const result = this.state.testResults[taskId];
    let defaultType = 'yanlis';
    if (result && (result.empty > 0) && (result.wrong === 0)) {
      defaultType = 'bos';
    }
    this.openUploadQuestionModal(defaultType);
    if (task) {
      const bookSelect = document.getElementById('upload-q-book');
      if (bookSelect) {
        if (task.book.includes('MatBook')) {
          bookSelect.value = 'MatBook 9. Sınıf VDK';
        } else if (task.book.includes('Orijinal')) {
          bookSelect.value = 'Orijinal 9. Sınıf SB';
        } else {
          bookSelect.value = 'Diğer';
        }
      }
      const titleInput = document.getElementById('upload-q-title');
      if (titleInput) {
        titleInput.value = `${task.pages}, Soru `;
        setTimeout(() => titleInput.focus(), 150);
      }
      const noteInput = document.getElementById('upload-q-note');
      if (noteInput) {
        noteInput.placeholder = `Örn: ${task.title} konusunda takıldığım kısım...`;
      }
    }
  }

  openUploadFromCurrentTaskModal() {
    const taskId = this.activeModalTaskId;
    this.closeTaskModal();
    if (taskId) {
      this.openUploadQuestionModalForTask(taskId);
    } else {
      this.openUploadQuestionModal();
    }
  }

  async startLiveCamera() {
    const container = document.getElementById('live-camera-container');
    const buttonsGrid = document.getElementById('upload-q-buttons-grid');
    const video = document.getElementById('live-camera-video');
    const previewContainer = document.getElementById('upload-q-preview-container');

    if (previewContainer) previewContainer.classList.add('hidden');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.triggerNativeCamera();
      return;
    }

    try {
      this.stopLiveCamera();

      const constraints = {
        video: {
          facingMode: { ideal: this.currentFacingMode || 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.liveCameraStream = stream;

      if (video) {
        video.srcObject = stream;
        video.setAttribute('playsinline', '');
        video.setAttribute('autoplay', '');
        video.muted = true;
        await video.play();
      }

      if (container) container.classList.remove('hidden');
      if (buttonsGrid) buttonsGrid.classList.add('hidden');
    } catch (err) {
      console.warn("Live camera access failed, falling back to native file input:", err);
      this.stopLiveCamera();
      this.triggerNativeCamera();
    }
  }

  stopLiveCamera() {
    if (this.liveCameraStream) {
      this.liveCameraStream.getTracks().forEach(track => {
        try { track.stop(); } catch(e) {}
      });
      this.liveCameraStream = null;
    }
    const video = document.getElementById('live-camera-video');
    if (video) video.srcObject = null;
    const container = document.getElementById('live-camera-container');
    const buttonsGrid = document.getElementById('upload-q-buttons-grid');
    if (container) container.classList.add('hidden');
    if (buttonsGrid) buttonsGrid.classList.remove('hidden');
  }

  flipLiveCamera() {
    this.currentFacingMode = (this.currentFacingMode === 'environment' ? 'user' : 'environment');
    this.startLiveCamera();
  }

  captureLivePhoto() {
    const video = document.getElementById('live-camera-video');
    if (!video || !this.liveCameraStream) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const maxDim = 1200;
    let targetW = width;
    let targetH = height;

    if (targetW > maxDim || targetH > maxDim) {
      if (targetW > targetH) {
        targetH = Math.round((targetH * maxDim) / targetW);
        targetW = maxDim;
      } else {
        targetW = Math.round((targetW * maxDim) / targetH);
        targetH = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, targetW, targetH);

    const base64 = canvas.toDataURL('image/jpeg', 0.82);
    this.rawQuestionImageBase64 = base64;
    this.currentUploadImageBase64 = base64;

    const previewImg = document.getElementById('upload-q-preview-img');
    if (previewImg) previewImg.src = base64;

    const sizeKb = Math.round((base64.length * 3 / 4) / 1024);
    const badge = document.getElementById('upload-q-size-badge');
    if (badge) badge.textContent = `Fotoğraf Hazır (~${sizeKb} KB)`;

    document.getElementById('btn-reset-q-image')?.classList.add('hidden');
    this.stopLiveCamera();

    const previewContainer = document.getElementById('upload-q-preview-container');
    if (previewContainer) previewContainer.classList.remove('hidden');

    this.showToast('Fotoğraf çekildi! ✂️ Otomatik Kırp butonuna dokunabilirsiniz.', 'fa-camera', 'text-indigo-500');
  }

  triggerNativeCamera() {
    const camInput = document.getElementById('upload-q-camera-input');
    if (camInput) {
      camInput.value = '';
      camInput.click();
    }
  }

  triggerNativeGallery() {
    const galInput = document.getElementById('upload-q-gallery-input');
    if (galInput) {
      galInput.value = '';
      galInput.click();
    }
  }

  closeUploadQuestionModal() {
    this.stopLiveCamera();
    document.getElementById('modal-upload-question')?.classList.add('hidden');
    this.clearQuestionImage();
  }

  clearQuestionImage() {
    this.stopLiveCamera();
    this.currentUploadImageBase64 = null;
    this.rawQuestionImageBase64 = null;
    document.getElementById('btn-reset-q-image')?.classList.add('hidden');
    const camInput = document.getElementById('upload-q-camera-input');
    const galInput = document.getElementById('upload-q-gallery-input');
    if (camInput) camInput.value = '';
    if (galInput) galInput.value = '';
    document.getElementById('upload-q-loading')?.classList.add('hidden');
    document.getElementById('upload-q-preview-container')?.classList.add('hidden');
    const previewImg = document.getElementById('upload-q-preview-img');
    if (previewImg) previewImg.src = '';
  }

  previewQuestionImage(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    this.stopLiveCamera();
    const loadingEl = document.getElementById('upload-q-loading');
    const previewContainer = document.getElementById('upload-q-preview-container');
    const previewImg = document.getElementById('upload-q-preview-img');
    const sizeBadge = document.getElementById('upload-q-size-badge');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (previewContainer) previewContainer.classList.add('hidden');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 1200;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', 0.80);
          this.rawQuestionImageBase64 = compressed;
          this.currentUploadImageBase64 = compressed;

          if (previewImg) previewImg.src = compressed;
          const sizeKb = Math.round((compressed.length * 3 / 4) / 1024);
          if (sizeBadge) sizeBadge.textContent = `Fotoğraf Hazır (~${sizeKb} KB)`;

          document.getElementById('btn-reset-q-image')?.classList.add('hidden');
          if (loadingEl) loadingEl.classList.add('hidden');
          if (previewContainer) previewContainer.classList.remove('hidden');
        } catch (err) {
          console.error("Canvas draw error:", err);
          this.rawQuestionImageBase64 = e.target.result;
          this.currentUploadImageBase64 = e.target.result;
          if (previewImg) previewImg.src = e.target.result;
          if (loadingEl) loadingEl.classList.add('hidden');
          if (previewContainer) previewContainer.classList.remove('hidden');
        }
      };
      img.onerror = () => {
        if (loadingEl) loadingEl.classList.add('hidden');
        alert("Görsel yüklenemedi. Lütfen tekrar deneyiniz.");
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      if (loadingEl) loadingEl.classList.add('hidden');
      alert("Dosya okunamadı.");
    };
    reader.readAsDataURL(file);
  }

  // -------------------------------------------------------------------------
  // SORU RESMİ KIRPMA & DÜZENLEME ARAÇLARI (AUTO-CROP, ROTATE, CONTRAST)
  // -------------------------------------------------------------------------
  autoCropQuestion(silent = false) {
    if (!this.currentUploadImageBase64) {
      if (!silent) this.showToast('Lütfen önce bir fotoğraf çekin veya seçin.', 'fa-circle-exclamation', 'text-amber-500');
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        if (!origW || !origH) return;

        const canvas = document.createElement('canvas');
        canvas.width = origW;
        canvas.height = origH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, origW, origH);
        const data = imgData.data;

        // Masa/zemin kenarlarını tespit et: 4 köşeden örnekleme
        let cornerDarkSamples = 0;
        let totalCornerSamples = 0;
        const cornerX = Math.max(5, Math.floor(origW * 0.05));
        const cornerY = Math.max(5, Math.floor(origH * 0.05));

        for (let y = 0; y < origH; y += 4) {
          for (let x = 0; x < origW; x += 4) {
            const inCorner = (x < cornerX || x > origW - cornerX) &&
                             (y < cornerY || y > origH - cornerY);
            if (inCorner) {
              totalCornerSamples++;
              const idx = (y * origW + x) * 4;
              const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              if (lum < 130) cornerDarkSamples++;
            }
          }
        }

        const hasDarkDeskBorder = totalCornerSamples > 0 && (cornerDarkSamples / totalCornerSamples) > 0.35;

        let minX = 0, maxX = origW - 1, minY = 0, maxY = origH - 1;

        if (hasDarkDeskBorder) {
          // Sayfa sınırlarını bul (parlaklık > 140 olan kağıt alanı)
          const rowPaper = new Int32Array(origH);
          const colPaper = new Int32Array(origW);
          for (let y = 0; y < origH; y += 3) {
            for (let x = 0; x < origW; x += 3) {
              const idx = (y * origW + x) * 4;
              const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
              if (lum > 140) {
                rowPaper[y]++;
                colPaper[x]++;
              }
            }
          }
          const threshW = (origW / 3) * 0.18;
          const threshH = (origH / 3) * 0.18;
          while (minY < origH - 20 && rowPaper[minY] < threshW) minY++;
          while (maxY > minY + 20 && rowPaper[maxY] < threshW) maxY--;
          while (minX < origW - 20 && colPaper[minX] < threshH) minX++;
          while (maxX > minX + 20 && colPaper[maxX] < threshH) maxX--;
        }

        const subW = maxX - minX;
        const subH = maxY - minY;

        // Yazı/Soru içeriği sınırlarını tespit et (koyu mürekkep pikselleri)
        const rowInk = new Int32Array(origH);
        const colInk = new Int32Array(origW);

        for (let y = minY; y <= maxY; y += 2) {
          for (let x = minX; x <= maxX; x += 2) {
            const idx = (y * origW + x) * 4;
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            if (lum < 145) {
              rowInk[y]++;
              colInk[x]++;
            }
          }
        }

        const inkRowThresh = Math.max(3, (subW / 2) * 0.012);
        const inkColThresh = Math.max(3, (subH / 2) * 0.012);

        let qMinY = minY;
        let qMaxY = maxY;
        let qMinX = minX;
        let qMaxX = maxX;

        while (qMinY < maxY - 15 && rowInk[qMinY] < inkRowThresh) qMinY++;
        while (qMaxY > qMinY + 15 && rowInk[qMaxY] < inkRowThresh) qMaxY--;
        while (qMinX < maxX - 15 && colInk[qMinX] < inkColThresh) qMinX++;
        while (qMaxX > qMinX + 15 && colInk[qMaxX] < inkColThresh) qMaxX--;

        // Güvenli kenar payı (~%3.5 veya 16px)
        const padX = Math.round(Math.max(16, subW * 0.035));
        const padY = Math.round(Math.max(16, subH * 0.035));

        const finalMinX = Math.max(0, qMinX - padX);
        const finalMaxX = Math.min(origW, qMaxX + padX);
        const finalMinY = Math.max(0, qMinY - padY);
        const finalMaxY = Math.min(origH, qMaxY + padY);

        const cropW = finalMaxX - finalMinX;
        const cropH = finalMaxY - finalMinY;

        if (cropW >= origW * 0.15 && cropH >= origH * 0.15 && (cropW < origW * 0.97 || cropH < origH * 0.97)) {
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = cropW;
          cropCanvas.height = cropH;
          const cropCtx = cropCanvas.getContext('2d');
          cropCtx.imageSmoothingEnabled = true;
          cropCtx.imageSmoothingQuality = 'high';
          cropCtx.drawImage(canvas, finalMinX, finalMinY, cropW, cropH, 0, 0, cropW, cropH);

          const croppedBase64 = cropCanvas.toDataURL('image/jpeg', 0.85);
          this.currentUploadImageBase64 = croppedBase64;

          const previewImg = document.getElementById('upload-q-preview-img');
          if (previewImg) previewImg.src = croppedBase64;

          const sizeKb = Math.round((croppedBase64.length * 3 / 4) / 1024);
          const badge = document.getElementById('upload-q-size-badge');
          if (badge) badge.textContent = `✂️ Kırpıldı: ${cropW}x${cropH} (~${sizeKb} KB)`;

          document.getElementById('btn-reset-q-image')?.classList.remove('hidden');
          if (!silent) {
            this.showToast('Soru sınırları otomatik algılandı ve kırpıldı! ✨', 'fa-crop-simple', 'text-emerald-500');
          }
        } else {
          if (!silent) {
            this.showToast('Fotoğraf zaten kırpılmış veya kenarlıklar belirgin değil.', 'fa-circle-info', 'text-amber-500');
          }
        }
      } catch (err) {
        console.error("Auto crop error:", err);
        if (!silent) alert("Otomatik kırpma işlemi gerçekleştirilemedi.");
      }
    };
    img.src = this.currentUploadImageBase64;
  }

  rotateQuestionImage(deg = 90) {
    if (!this.currentUploadImageBase64) return;
    const img = new Image();
    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const canvas = document.createElement('canvas');
        canvas.width = origH;
        canvas.height = origW;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((deg * Math.PI) / 180);
        ctx.drawImage(img, -origW / 2, -origH / 2);

        const rotated = canvas.toDataURL('image/jpeg', 0.85);
        this.currentUploadImageBase64 = rotated;

        const previewImg = document.getElementById('upload-q-preview-img');
        if (previewImg) previewImg.src = rotated;

        const sizeKb = Math.round((rotated.length * 3 / 4) / 1024);
        const badge = document.getElementById('upload-q-size-badge');
        if (badge) badge.textContent = `🔄 Döndürüldü (~${sizeKb} KB)`;

        document.getElementById('btn-reset-q-image')?.classList.remove('hidden');
        this.showToast('Fotoğraf 90° döndürüldü', 'fa-rotate-right', 'text-indigo-500');
      } catch (e) {
        console.error("Rotate error:", e);
      }
    };
    img.src = this.currentUploadImageBase64;
  }

  enhanceQuestionPaper() {
    if (!this.currentUploadImageBase64) return;
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;

        // Kağıdı beyazlat, mürekkebi/yazıları koyulaştır (Belge tarayıcı efekti)
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i], g = d[i + 1], b = d[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum > 165) {
            d[i] = Math.min(255, Math.round(r * 1.15 + 20));
            d[i + 1] = Math.min(255, Math.round(g * 1.15 + 20));
            d[i + 2] = Math.min(255, Math.round(b * 1.15 + 20));
          } else if (lum < 140) {
            d[i] = Math.max(0, Math.round(r * 0.85 - 10));
            d[i + 1] = Math.max(0, Math.round(g * 0.85 - 10));
            d[i + 2] = Math.max(0, Math.round(b * 0.85 - 10));
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const enhanced = canvas.toDataURL('image/jpeg', 0.85);
        this.currentUploadImageBase64 = enhanced;

        const previewImg = document.getElementById('upload-q-preview-img');
        if (previewImg) previewImg.src = enhanced;

        document.getElementById('btn-reset-q-image')?.classList.remove('hidden');
        this.showToast('Yazılar ve kağıt zemin netleştirildi ✨', 'fa-wand-magic-sparkles', 'text-amber-500');
      } catch (e) {
        console.error("Enhance error:", e);
      }
    };
    img.src = this.currentUploadImageBase64;
  }

  trimEdgesPercent(pct = 7) {
    if (!this.currentUploadImageBase64) return;
    const img = new Image();
    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;
        const trimX = Math.round(origW * (pct / 100));
        const trimY = Math.round(origH * (pct / 100));
        const newW = origW - trimX * 2;
        const newH = origH - trimY * 2;
        if (newW <= 50 || newH <= 50) return;

        const canvas = document.createElement('canvas');
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, trimX, trimY, newW, newH, 0, 0, newW, newH);

        const trimmed = canvas.toDataURL('image/jpeg', 0.85);
        this.currentUploadImageBase64 = trimmed;

        const previewImg = document.getElementById('upload-q-preview-img');
        if (previewImg) previewImg.src = trimmed;

        const sizeKb = Math.round((trimmed.length * 3 / 4) / 1024);
        const badge = document.getElementById('upload-q-size-badge');
        if (badge) badge.textContent = `✂️ Kenar Kırpıldı (~${sizeKb} KB)`;

        document.getElementById('btn-reset-q-image')?.classList.remove('hidden');
        this.showToast(`Kenarlar %${pct} kırpıldı`, 'fa-compress', 'text-indigo-500');
      } catch (e) {
        console.error("Trim error:", e);
      }
    };
    img.src = this.currentUploadImageBase64;
  }

  resetOriginalImage() {
    if (!this.rawQuestionImageBase64) return;
    this.currentUploadImageBase64 = this.rawQuestionImageBase64;

    const previewImg = document.getElementById('upload-q-preview-img');
    if (previewImg) previewImg.src = this.rawQuestionImageBase64;

    const sizeKb = Math.round((this.rawQuestionImageBase64.length * 3 / 4) / 1024);
    const badge = document.getElementById('upload-q-size-badge');
    if (badge) badge.textContent = `Orijinal Fotoğraf (~${sizeKb} KB)`;

    document.getElementById('btn-reset-q-image')?.classList.add('hidden');
    this.showToast('Fotoğraf ilk çekilen haline döndürüldü', 'fa-arrow-rotate-left', 'text-slate-500');
  }

  async saveUploadedQuestion() {
    const book = document.getElementById('upload-q-book')?.value || '';
    let title = (document.getElementById('upload-q-title')?.value || '').trim();
    const note = (document.getElementById('upload-q-note')?.value || '').trim();
    const qType = document.querySelector('input[name="upload-q-type"]:checked')?.value || 'yanlis';

    if (!this.currentUploadImageBase64) {
      alert("Lütfen önce kamerayı açıp sorunun fotoğrafını çekin veya galeriden bir fotoğraf seçin.");
      return;
    }

    if (!title) {
      const nowStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
      title = `${book} - ${nowStr} Sorusu`;
    }

    const saveBtn = document.getElementById('btn-save-question');
    const origHtml = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Kaydediliyor...';
    }

    const questionEntry = {
      id: `q-${Date.now()}`,
      book: book,
      title: title,
      note: note,
      type: qType, // 'yanlis' | 'bos'
      imageBase64: this.currentUploadImageBase64,
      date: new Date().toISOString().split('T')[0],
      solved: false
    };

    if (!this.state.questions) this.state.questions = [];
    this.state.questions.push(questionEntry);

    // Save locally and close modal instantly so user never hangs
    this.saveState();
    this.closeUploadQuestionModal();
    this.renderQuestionsView();
    this.showToast(qType === 'bos' ? 'Boş soru deftere eklendi!' : 'Yanlış soru deftere eklendi!', 'fa-camera', 'text-indigo-500');

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = origHtml;
    }

    // Google Drive upload asynchronously in background
    if (this.state.cloudSettings.scriptUrl && this.currentUploadImageBase64) {
      const scriptUrl = this.state.cloudSettings.scriptUrl;
      const imgData = this.currentUploadImageBase64;
      setTimeout(() => {
        fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'uploadQuestion',
            imageData: imgData,
            fileName: `Deniz_${qType}_${book}_${title}.jpg`,
            notes: `[${qType === 'bos' ? 'BOŞ' : 'YANLIŞ'}] ${note}`
          })
        }).then(() => {
          this.showToast("Fotoğraf Google Drive'a başarıyla yedeklendi!", "fa-cloud-arrow-up", "text-emerald-500");
        }).catch(err => {
          console.warn("Background drive upload note:", err);
        });
      }, 50);
    }
  }

  toggleQuestionSolved(id) {
    const q = (this.state.questions || []).find(x => x.id === id);
    if (q) {
      q.solved = !q.solved;
      this.saveState();
      this.renderQuestionsView();
      this.showToast(q.solved ? 'Soru çözüldü olarak işaretlendi' : 'Soru bekliyor olarak işaretlendi', 'fa-check', 'text-emerald-500');
    }
  }

  deleteQuestion(id) {
    if (!confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
    this.state.questions = (this.state.questions || []).filter(q => q.id !== id);
    this.saveState();
    this.renderQuestionsView();
    this.showToast('Soru silindi', 'fa-trash-can', 'text-slate-400');
  }

  // -------------------------------------------------------------------------
  // CLOUD SYNC & GAS INTEGRATION
  // -------------------------------------------------------------------------
  debouncedCloudSync() {
    clearTimeout(this._syncTimeout);
    this._syncTimeout = setTimeout(() => {
      this.syncWithCloud(true);
    }, 2000);
  }

  setupAutoSync() {
    if (this.state.cloudSettings.scriptUrl) {
      this.fetchFromCloud();
    }
  }

  async syncWithCloud(silent = false) {
    const url = this.state.cloudSettings.scriptUrl;
    if (!url) {
      if (!silent) this.showToast('Bulut URL ayarlanmamış (Ayarlar sekmesine gidin)', 'fa-triangle-exclamation', 'text-amber-500');
      return;
    }

    this.setCloudStatus('syncing', 'Yedekleniyor...');

    try {
      const payload = {
        action: 'saveProgress',
        data: {
          completedTasks: this.state.completedTasks,
          testResults: this.state.testResults,
          denemeler: this.state.denemeler,
          questions: this.state.questions,
          streak: this.state.streak,
          xp: this.state.xp,
          settings: this.state.cloudSettings,
          schedule: this.schedule
        }
      };

      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      this.setCloudStatus('synced', 'Senkronize');
      if (!silent) this.showToast('Tüm veriler Google Drive bulutuna senkronize edildi!', 'fa-cloud-arrow-up', 'text-emerald-500');
    } catch (e) {
      console.error("Cloud sync error:", e);
      this.setCloudStatus('error', 'Hata');
      if (!silent) this.showToast('Bulut senkronizasyonunda hata oluştu', 'fa-circle-xmark', 'text-rose-500');
    }
  }

  async fetchFromCloud() {
    const url = this.state.cloudSettings.scriptUrl;
    if (!url) return;

    try {
      const res = await fetch(`${url}?action=loadProgress`);
      const json = await res.json();
      if (json && json.status === 'success' && json.data) {
        const cloudData = json.data;
        if (cloudData.completedTasks) this.state.completedTasks = cloudData.completedTasks;
        if (cloudData.testResults) this.state.testResults = cloudData.testResults;
        if (cloudData.denemeler) this.state.denemeler = cloudData.denemeler;
        if (cloudData.questions) this.state.questions = cloudData.questions;
        if (cloudData.streak) this.state.streak = cloudData.streak;
        if (cloudData.xp) this.state.xp = cloudData.xp;
        this.saveState(true);
        this.renderAllViews();
        this.setCloudStatus('synced', 'Senkronize');
      }
    } catch (e) {
      console.warn("Could not fetch from cloud, offline mode:", e);
    }
  }

  setCloudStatus(type, text) {
    const dot = document.getElementById('cloud-status-dot');
    const txt = document.getElementById('cloud-status-text');
    if (!dot || !txt) return;

    txt.textContent = text;
    if (type === 'synced') {
      dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
    } else if (type === 'syncing') {
      dot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-ping';
    } else {
      dot.className = 'w-2 h-2 rounded-full bg-rose-500';
    }
  }

  async triggerFridayReportTest() {
    const url = this.state.cloudSettings.scriptUrl;
    if (!url) {
      alert("Lütfen önce yukarıdaki alana Google Apps Script Web App URL'nizi yapıştırıp kaydedin.");
      return;
    }

    this.showToast('Cuma 21:00 raporu hazırlanıyor...', 'fa-paper-plane', 'text-blue-500');
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendFridayReportNow',
          data: this.state
        })
      });
      alert(`✅ Cuma 21:00 Haftalık Karne Raporu başarıyla gönderildi!\n\nAlıcılar:\n- Öğretmen: ${this.state.cloudSettings.teacherEmail}\n- Veliler: ${this.state.cloudSettings.parentEmails || 'Yok'}`);
    } catch (err) {
      alert("Hata: " + err);
    }
  }

  async triggerDailyReminderTest() {
    const url = this.state.cloudSettings.scriptUrl;
    if (!url) {
      alert("Lütfen önce yukarıdaki alana Google Apps Script Web App URL'nizi yapıştırıp kaydedin.");
      return;
    }

    this.showToast('Günlük hatırlatma maili gönderiliyor...', 'fa-bell', 'text-amber-500');
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendDailyReminderNow',
          data: this.state
        })
      });
      alert(`✅ Günlük Ödev Hatırlatma E-postası başarıyla gönderildi!\n\nAlıcılar:\n- Öğretmen: ${this.state.cloudSettings.teacherEmail}\n- Veliler: ${this.state.cloudSettings.parentEmails || 'Yok'}`);
    } catch (err) {
      alert("Hata: " + err);
    }
  }

  async triggerSetupTriggers() {
    const url = this.state.cloudSettings.scriptUrl;
    if (!url) {
      alert("Lütfen önce yukarıdaki alana Google Apps Script Web App URL'nizi yapıştırıp kaydedin.");
      return;
    }

    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setupTriggersNow'
        })
      });
      alert("🎉 Cuma 21:00 ve Günlük 17:00 otomatik zamanlayıcıları Google sunucularında kuruldu!");
    } catch (err) {
      alert("Hata: " + err);
    }
  }

  // -------------------------------------------------------------------------
  // GAMIFICATION & HELPERS
  // -------------------------------------------------------------------------
  addXp(amount) {
    this.state.xp = (this.state.xp || 0) + amount;
  }

  updateStreak() {
    const todayStr = new Date().toISOString().split('T')[0];
    if (this.state.lastStreakDate === todayStr) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (this.state.lastStreakDate === yesterdayStr) {
      this.state.streak = (this.state.streak || 0) + 1;
    } else if (!this.state.lastStreakDate) {
      this.state.streak = 1;
    } else {
      this.state.streak = 1;
    }
    this.state.lastStreakDate = todayStr;
  }

  confettiCelebration() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  }

  showToast(message, icon = 'fa-circle-check', iconColor = 'text-emerald-500') {
    const toast = document.getElementById('toast-notification');
    const msgEl = document.getElementById('toast-message');
    const iconEl = document.getElementById('toast-icon');

    if (!toast || !msgEl || !iconEl) return;

    msgEl.textContent = message;
    iconEl.className = `fa-solid ${icon} ${iconColor} text-base`;

    toast.classList.remove('translate-y-[-100px]', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    clearTimeout(this._toastTimeout);
    this._toastTimeout = setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-[-100px]', 'opacity-0');
    }, 3200);
  }

  toggleDarkMode() {
    this.state.darkMode = !this.state.darkMode;
    this.applyTheme();
    this.saveState(true);
  }

  applyTheme() {
    const icon = document.getElementById('dark-icon');
    if (this.state.darkMode) {
      document.documentElement.classList.add('dark');
      if (icon) icon.className = 'fa-solid fa-sun';
    } else {
      document.documentElement.classList.remove('dark');
      if (icon) icon.className = 'fa-solid fa-moon';
    }
    if (this.denemeChartInstance) {
      this.renderDenemeChart();
    }
    if (this.denemeRadarChartInstance) {
      this.renderDenemeRadarChart(this.calcSubjectStats());
    }
  }

  setupPwa() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.log('[SW] Registration failed:', err);
        });
      });
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true);
    if (isStandalone) {
      this.hideInstallButtons();
      return;
    }

    if (globalDeferredInstallPrompt) {
      this.deferredInstallPrompt = globalDeferredInstallPrompt;
      this.showInstallButtons();
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      globalDeferredInstallPrompt = e;
      this.showInstallButtons();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      globalDeferredInstallPrompt = null;
      this.hideInstallButtons();
      this.showToast('Uygulama başarıyla yüklendi! 📱', 'fa-circle-check', 'text-emerald-500');
    });
  }

  onInstallReady() {
    this.deferredInstallPrompt = globalDeferredInstallPrompt;
    this.showInstallButtons();
  }

  showInstallButtons() {
    const banner = document.getElementById('today-install-banner');
    if (banner) banner.classList.remove('hidden');
    const headerBtn = document.getElementById('btn-header-install');
    if (headerBtn) headerBtn.classList.remove('hidden');
    const settingsBtn = document.getElementById('btn-pwa-install');
    if (settingsBtn) settingsBtn.classList.remove('hidden');
  }

  hideInstallButtons() {
    const banner = document.getElementById('today-install-banner');
    if (banner) banner.classList.add('hidden');
    const headerBtn = document.getElementById('btn-header-install');
    if (headerBtn) headerBtn.classList.add('hidden');
    const settingsBtn = document.getElementById('btn-pwa-install');
    if (settingsBtn) settingsBtn.classList.add('hidden');
  }

  async triggerPwaInstall() {
    const promptEvent = this.deferredInstallPrompt || globalDeferredInstallPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          this.showToast('Deniz Matematik uygulaması telefonunuza indiriliyor! 🎉', 'fa-circle-check', 'text-emerald-500');
          this.hideInstallButtons();
        }
        this.deferredInstallPrompt = null;
        globalDeferredInstallPrompt = null;
      } catch (err) {
        console.error('PWA install prompt error:', err);
        this.openInstallGuideModal();
      }
    } else {
      this.openInstallGuideModal();
    }
  }

  openInstallGuideModal() {
    const modal = document.getElementById('modal-install-guide');
    if (modal) modal.classList.remove('hidden');
  }

  closeInstallGuideModal() {
    const modal = document.getElementById('modal-install-guide');
    if (modal) modal.classList.add('hidden');
  }

  exportBackupJson() {
    const jsonStr = JSON.stringify(this.state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Deniz_Matematik_Yedek_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Yedek dosyası indirildi', 'fa-download', 'text-blue-500');
  }

  importBackupJson(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && typeof parsed === 'object') {
          this.state = { ...this.state, ...parsed };
          this.saveState();
          this.renderAllViews();
          this.showToast('Yedek başarıyla geri yüklendi!', 'fa-circle-check', 'text-emerald-500');
        }
      } catch (err) {
        alert("Geçersiz yedek dosyası: " + err);
      }
    };
    reader.readAsText(file);
  }

  resetAllDataConfirm() {
    if (confirm("DİKKAT: Deniz'in tüm test ve deneme verilerini sıfırlamak istediğinize emin misiniz?")) {
      const pin = prompt("Öğretmen & Yönetici şifresini giriniz (2026):");
      if (pin === this.SETTINGS_PASSWORD) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      } else {
        alert("Hatalı şifre!");
      }
    }
  }
}

// Global instance
const appEngine = new DenizAppEngine();
document.addEventListener('DOMContentLoaded', () => {
  appEngine.init();
});
