/**
 * =========================================================================
 * DENİZ 9. SINIF MATEMATİK & DENEME TAKİP PLATFORMU - APP ENGINE (v2.0)
 * =========================================================================
 * Başlangıç: 21 Ekim 2026 Çarşamba | Bitiş: 1 Haziran 2027 Salı
 * Dağılım: Hafta İçi Günlük 1 Görev, Hafta Sonu Günlük 2 Görev
 */

const STORAGE_KEY = 'deniz_9_sinif_progress_v1';

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
        parentEmails: ''
      },
      streak: 0,
      xp: 0,
      lastStreakDate: null,
      darkMode: false
    };

    this.activeModalTaskId = null;
    this.deferredInstallPrompt = null;
    this.denemeChartInstance = null;
    this.currentUploadImageBase64 = null;
    this.qFilter = 'all';
    this.selectedThemeFilter = 'all';
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
        ? 'mob-tab-btn flex flex-col items-center justify-center text-brand-600 dark:text-brand-400'
        : 'mob-tab-btn flex flex-col items-center justify-center text-slate-500 dark:text-slate-400';
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
        chipEl.className = 'px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
        chipEl.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Tamamlandı';
      } else if (someCompleted) {
        chipEl.className = 'px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
        chipEl.innerHTML = '1/2 Tamamlandı';
      } else {
        chipEl.className = 'px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
        chipEl.innerHTML = isWeekend ? 'Hafta Sonu Ödevi Bekliyor' : 'Ödev Bekliyor';
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
        ? `<div class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-black uppercase mb-2">
            <i class="fa-solid fa-layer-group text-amber-400"></i>
            <span>GÖREV ${idx + 1} / ${currentTasks.length}</span>
           </div>`
        : '';

      cardsHtml += `
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-5">
          ${taskHeaderBadge}

          <!-- Badges Bar -->
          <div class="flex flex-wrap items-center gap-2">
            ${typeBadge}
            <span class="px-3 py-1 rounded-full text-xs font-bold ${bookBadgeColor}">
              ${task.book}
            </span>
            <span class="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
              ${task.pages}
            </span>
            ${task.q_count ? `<span class="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">${task.q_count} Soru</span>` : ''}
          </div>

          <!-- Task Title & Scope -->
          <div>
            <div class="text-xs font-extrabold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-1">
              ${task.theme} • ${task.subtopic}
            </div>
            <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
              ${task.title}
            </h2>
            <p class="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
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
              <button onclick="appEngine.saveCardResult('${task.id}')" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-brand-600/30 flex items-center justify-center space-x-2 transition transform active:scale-[0.98]">
                <i class="fa-solid fa-circle-check text-lg"></i>
                <span>${isCompleted ? 'Sonucu Güncelle ve Kaydet' : 'Ödev Sonucunu Kaydet ve Tamamla'}</span>
              </button>

              <!-- Soru Yükleme Butonu -->
              <button onclick="appEngine.openUploadQuestionModalForTask('${task.id}')" class="w-full py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center space-x-2 transition hover:bg-indigo-100/60 active:scale-[0.98]">
                <i class="fa-solid fa-camera text-sm"></i>
                <span>Bu Ödevden Yapamadığım Soruyu Çek & Yükle</span>
              </button>
            </div>
          ` : `
            <div class="space-y-2.5 pt-2">
              <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
                    <i class="fa-solid fa-check"></i>
                  </div>
                  <div>
                    <div class="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                      ${isActivity ? 'Etkinlik Tamamlandı' : 'Test Tamamlandı'}
                    </div>
                    <div class="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      ${taskResult ? `${taskResult.correct || 0}D • ${taskResult.wrong || 0}Y • ${taskResult.empty || 0}B • <b class="text-blue-600 dark:text-blue-400">${taskResult.net || 0} Net</b> (${taskResult.duration || 20} dk)` : 'Tamamlandı'}
                    </div>
                  </div>
                </div>
                <button onclick="appEngine.toggleCardEditMode('${task.id}')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-slate-700 transition flex items-center space-x-1 shrink-0">
                  <i class="fa-solid fa-pen-to-square"></i>
                  <span>Düzenle</span>
                </button>
              </div>

              <button onclick="appEngine.openUploadQuestionModalForTask('${task.id}')" class="w-full py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 hover:border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center space-x-2 transition hover:bg-indigo-100/60 active:scale-[0.98]">
                <i class="fa-solid fa-camera text-sm"></i>
                <span>Bu Ödevden Yapamadığım Soruyu Çek & Yükle</span>
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

  renderDenemelerView() {
    const listContainer = document.getElementById('deneme-list-container');
    const denemeler = this.state.denemeler || [];

    document.getElementById('deneme-stat-count').textContent = denemeler.length;
    let totalNets = 0;
    let maxNet = 0;
    let latestNet = 0;

    if (denemeler.length > 0) {
      denemeler.forEach(d => {
        totalNets += (d.totalNet || 0);
        if (d.totalNet > maxNet) maxNet = d.totalNet;
      });
      latestNet = denemeler[denemeler.length - 1].totalNet || 0;
      document.getElementById('deneme-stat-avg').textContent = (totalNets / denemeler.length).toFixed(2);
      document.getElementById('deneme-stat-max').textContent = maxNet.toFixed(2);
      document.getElementById('deneme-stat-latest').textContent = latestNet.toFixed(2);
    } else {
      document.getElementById('deneme-stat-avg').textContent = '0.00';
      document.getElementById('deneme-stat-max').textContent = '0.00';
      document.getElementById('deneme-stat-latest').textContent = '0.00';
    }

    if (listContainer) {
      if (denemeler.length === 0) {
        listContainer.innerHTML = `
          <div class="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
            <i class="fa-solid fa-chart-pie text-4xl mb-3 text-slate-300 dark:text-slate-600"></i>
            <p class="text-sm font-semibold">Henüz kaydedilmiş deneme sınavı sonucu yok.</p>
            <p class="text-xs text-slate-400 mt-1">"Yeni Deneme Sınavı Ekle" butonuna basarak ilk sınav sonucunu girebilirsiniz.</p>
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
              return `<span class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                ${name}: <b class="text-blue-600 dark:text-blue-400">${sub.net} N</b> (${sub.d}D / ${sub.y}Y${qText})
              </span>`;
            }).join('');
          }

          return `
            <div class="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div class="flex items-start justify-between">
                <div>
                  <div class="flex items-center space-x-2">
                    <h4 class="text-base font-extrabold text-slate-900 dark:text-white">${d.name}</h4>
                    <span class="text-xs text-slate-400">• ${d.date}</span>
                  </div>
                  ${d.notes ? `<p class="text-xs text-slate-500 mt-1 italic">"${d.notes}"</p>` : ''}
                </div>
                <div class="text-right">
                  <div class="text-2xl font-black text-rose-600 dark:text-rose-400">${d.totalNet || 0} Net</div>
                  <div class="text-[11px] text-slate-400">${d.totalQ ? `<b class="text-slate-700 dark:text-slate-300">${d.totalQ} Soru</b> • ` : ''}${d.totalD || 0}D • ${d.totalY || 0}Y • ${d.totalB || 0}B</div>
                </div>
              </div>

              <div class="flex flex-wrap gap-1.5 pt-1">
                ${subjectsHtml}
              </div>

              <div class="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button onclick="appEngine.deleteDeneme('${d.id}')" class="text-xs font-semibold text-rose-500 hover:text-rose-700 transition">
                  <i class="fa-solid fa-trash-can mr-1"></i> Sil
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    this.renderDenemeChart();
  }

  renderDenemeChart() {
    const canvas = document.getElementById('denemeNetChart');
    if (!canvas) return;

    const denemeler = this.state.denemeler || [];
    const labels = denemeler.map(d => `${d.name.substring(0, 10)} (${d.date.substring(5)})`);
    const totalNets = denemeler.map(d => d.totalNet || 0);
    const mathNets = denemeler.map(d => (d.subjects && d.subjects.matematik) ? d.subjects.matematik.net : 0);

    if (this.denemeChartInstance) {
      this.denemeChartInstance.destroy();
    }

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    this.denemeChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels.length > 0 ? labels : ['Örnek 1', 'Örnek 2'],
        datasets: [
          {
            label: 'Toplam Net',
            data: totalNets.length > 0 ? totalNets : [0, 0],
            borderColor: '#e11d48',
            backgroundColor: 'rgba(225, 29, 72, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 3,
            pointRadius: 5
          },
          {
            label: 'Matematik Neti',
            data: mathNets.length > 0 ? mathNets : [0, 0],
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            tension: 0.3,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10 } },
            beginAtZero: true
          }
        },
        plugins: {
          legend: {
            labels: { color: textColor, font: { size: 11, weight: 'bold' } }
          }
        }
      }
    });
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
      bannerBadge.textContent = `${totalWrong} Yanlış • ${totalEmpty} Boş • ${totalPhotos} Fotoğraflı`;
    }

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

  closeUploadQuestionModal() {
    document.getElementById('modal-upload-question')?.classList.add('hidden');
    this.clearQuestionImage();
  }

  clearQuestionImage() {
    this.currentUploadImageBase64 = null;
    const camInput = document.getElementById('upload-q-camera-input');
    const galInput = document.getElementById('upload-q-gallery-input');
    if (camInput) camInput.value = '';
    if (galInput) galInput.value = '';
    document.getElementById('upload-q-preview-container')?.classList.add('hidden');
    const previewImg = document.getElementById('upload-q-preview-img');
    if (previewImg) previewImg.src = '';
  }

  previewQuestionImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Use HTML5 Canvas to resize and compress photos taken with phone cameras
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // High quality max 1280px dimension (crisp text, small size ~150-250KB)
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        this.currentUploadImageBase64 = compressedBase64;

        const previewImg = document.getElementById('upload-q-preview-img');
        if (previewImg) previewImg.src = compressedBase64;

        const sizeKb = Math.round((compressedBase64.length * 3 / 4) / 1024);
        const badge = document.getElementById('upload-q-size-badge');
        if (badge) badge.textContent = `Fotoğraf Hazır (~${sizeKb} KB)`;

        document.getElementById('upload-q-preview-container')?.classList.remove('hidden');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async saveUploadedQuestion() {
    const book = document.getElementById('upload-q-book')?.value || '';
    const title = (document.getElementById('upload-q-title')?.value || '').trim();
    const note = (document.getElementById('upload-q-note')?.value || '').trim();
    const qType = document.querySelector('input[name="upload-q-type"]:checked')?.value || 'yanlis';

    if (!title) {
      alert("Lütfen sayfa ve soru numarasını giriniz.");
      return;
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

    this.saveState();
    this.closeUploadQuestionModal();
    this.renderQuestionsView();
    this.showToast(qType === 'bos' ? 'Boş soru deftere eklendi!' : 'Yanlış soru deftere eklendi!', 'fa-camera', 'text-indigo-500');

    if (this.state.cloudSettings.scriptUrl && this.currentUploadImageBase64) {
      try {
        fetch(this.state.cloudSettings.scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'uploadQuestion',
            imageData: this.currentUploadImageBase64,
            fileName: `Deniz_${qType}_${book}_${title}.jpg`,
            notes: `[${qType === 'bos' ? 'BOŞ' : 'YANLIŞ'}] ${note}`
          })
        });
      } catch (err) {
        console.warn("Cloud photo upload error:", err);
      }
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
  }

  setupPwa() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.log('[SW] Registration failed:', err);
        });
      });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      const installBtn = document.getElementById('btn-pwa-install');
      if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.onclick = async () => {
          if (this.deferredInstallPrompt) {
            this.deferredInstallPrompt.prompt();
            const { outcome } = await this.deferredInstallPrompt.userChoice;
            if (outcome === 'accepted') {
              installBtn.classList.add('hidden');
            }
            this.deferredInstallPrompt = null;
          }
        };
      }
    });
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
      const pin = prompt("Öğretmen PIN kodunu giriniz:");
      if (pin === '2026' || pin === '1984') {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      } else {
        alert("Hatalı PIN kodu!");
      }
    }
  }
}

// Global instance
const appEngine = new DenizAppEngine();
document.addEventListener('DOMContentLoaded', () => {
  appEngine.init();
});
