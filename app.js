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
          ${!isCompleted ? `
            <div class="pt-2">
              <button onclick="appEngine.openTaskModal('${task.id}')" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-brand-600/30 flex items-center justify-center space-x-2 transition transform active:scale-[0.98]">
                <i class="fa-solid fa-circle-check text-lg"></i>
                <span>${isActivity ? '2 Sayfa Etkinliği Tamamladım' : 'Test Sonucunu Gir (Doğru / Yanlış)'}</span>
              </button>
            </div>
          ` : resultSummaryHtml}

        </div>
      `;
    });

    container.innerHTML = `<div class="space-y-4">${cardsHtml}</div>`;
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
      <div class="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
        <div class="col-span-5 font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-2 truncate">
          <i class="fa-solid ${sub.icon} ${sub.color}"></i>
          <span>${sub.name}</span>
        </div>
        <div class="col-span-2">
          <input type="number" id="sub-d-${sub.id}" placeholder="D" min="0" max="50" oninput="appEngine.calcDenemeModalTotalNet()" class="w-full text-center py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-bold focus:outline-none">
        </div>
        <div class="col-span-2">
          <input type="number" id="sub-y-${sub.id}" placeholder="Y" min="0" max="50" oninput="appEngine.calcDenemeModalTotalNet()" class="w-full text-center py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-rose-700 dark:text-rose-400 font-bold focus:outline-none">
        </div>
        <div class="col-span-1">
          <input type="number" id="sub-b-${sub.id}" placeholder="B" min="0" max="50" class="w-full text-center py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 font-bold focus:outline-none">
        </div>
        <div class="col-span-2 text-right font-black text-blue-600 dark:text-blue-400" id="sub-net-${sub.id}">
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
              if (!sub || (sub.d === 0 && sub.y === 0 && sub.b === 0)) return '';
              const match = this.denemeSubjects.find(s => s.id === k);
              const name = match ? match.name : k;
              return `<span class="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                ${name}: <b class="text-blue-600">${sub.net} N</b> (${sub.d}D / ${sub.y}Y)
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
                  <div class="text-[11px] text-slate-400">${d.totalD || 0}D • ${d.totalY || 0}Y • ${d.totalB || 0}B</div>
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

  // TAB 5: QUESTIONS POOL
  filterQuestions(filter) {
    this.qFilter = filter;
    document.querySelectorAll('[data-q-filter]').forEach(b => {
      const isTarget = b.getAttribute('data-q-filter') === filter;
      b.className = isTarget
        ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white transition'
        : 'px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition';
    });
    this.renderQuestionsView();
  }

  renderQuestionsView() {
    const container = document.getElementById('questions-grid-container');
    if (!container) return;

    let questions = this.state.questions || [];
    if (this.qFilter === 'unsolved') {
      questions = questions.filter(q => !q.solved);
    } else if (this.qFilter === 'solved') {
      questions = questions.filter(q => q.solved);
    }

    if (questions.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
          <i class="fa-solid fa-circle-question text-4xl mb-3 text-slate-300 dark:text-slate-600"></i>
          <p class="text-sm font-semibold">Kayıtlı soru fotoğrafı bulunamadı.</p>
          <p class="text-xs text-slate-400 mt-1">Takıldığınız soruların fotoğrafını çekip buraya ekleyebilirsiniz.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = questions.slice().reverse().map(q => `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div class="flex items-center justify-between">
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${q.solved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${q.solved ? '✅ Çözüldü' : '⏳ Çözüm Bekliyor'}
          </span>
          <span class="text-[10px] text-slate-400">${q.date || ''}</span>
        </div>

        ${q.imageBase64 ? `
          <div class="w-full h-44 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
            <img src="${q.imageBase64}" alt="Soru" class="w-full h-full object-contain">
          </div>
        ` : ''}

        <div>
          <div class="text-xs font-bold text-slate-700 dark:text-slate-300">${q.book} • ${q.title}</div>
          ${q.note ? `<p class="text-xs text-slate-500 mt-1">"${q.note}"</p>` : ''}
        </div>

        <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button onclick="appEngine.toggleQuestionSolved('${q.id}')" class="text-xs font-bold ${q.solved ? 'text-amber-600' : 'text-emerald-600'}">
            ${q.solved ? 'Bekliyor Olarak İşaretle' : 'Çözüldü Olarak İşaretle'}
          </button>
          <button onclick="appEngine.deleteQuestion('${q.id}')" class="text-xs text-rose-500 hover:text-rose-700">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `).join('');
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

    document.getElementById('modal-type-badge').textContent = isActivity ? '2 SAYFA ETKİNLİK' : 'TEST SONUCU';
    document.getElementById('modal-task-title').textContent = task.title;
    document.getElementById('modal-task-subtitle').textContent = `${task.book} • ${task.pages} (${task.subtopic})`;

    const testSection = document.getElementById('modal-test-section');
    const actSection = document.getElementById('modal-activity-section');

    const existingResult = this.state.testResults[taskId] || null;

    if (isActivity) {
      testSection.classList.add('hidden');
      actSection.classList.remove('hidden');
      document.getElementById('input-activity-completed').checked = !!this.state.completedTasks[taskId];
    } else {
      testSection.classList.remove('hidden');
      actSection.classList.add('hidden');
      document.getElementById('input-correct').value = existingResult ? existingResult.correct : 0;
      document.getElementById('input-wrong').value = existingResult ? existingResult.wrong : 0;
      document.getElementById('input-empty').value = existingResult ? existingResult.empty : 0;
      document.getElementById('input-duration').value = existingResult ? existingResult.duration : '';
      this.calcModalNet();
    }

    document.getElementById('input-task-notes').value = existingResult ? existingResult.notes : '';
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

    if (isActivity) {
      const isChecked = document.getElementById('input-activity-completed')?.checked;
      if (isChecked) {
        this.state.completedTasks[task.id] = true;
        this.state.testResults[task.id] = {
          isActivity: true,
          notes: notes,
          timestamp: new Date().toISOString()
        };
        this.addXp(50);
        this.updateStreak();
        this.confettiCelebration();
        this.showToast('Etkinlik tamamlandı! +50 XP', 'fa-award', 'text-amber-500');
      } else {
        delete this.state.completedTasks[task.id];
        delete this.state.testResults[task.id];
      }
    } else {
      const c = parseInt(document.getElementById('input-correct')?.value) || 0;
      const w = parseInt(document.getElementById('input-wrong')?.value) || 0;
      const b = parseInt(document.getElementById('input-empty')?.value) || 0;
      const duration = parseInt(document.getElementById('input-duration')?.value) || null;
      const net = Math.max(0, Math.round((c - (w / 4)) * 100) / 100);

      this.state.completedTasks[task.id] = true;
      this.state.testResults[task.id] = {
        isActivity: false,
        totalQ: c + w + b,
        correct: c,
        wrong: w,
        empty: b,
        net: net,
        duration: duration,
        notes: notes,
        timestamp: new Date().toISOString()
      };

      this.addXp(100);
      this.updateStreak();
      this.confettiCelebration();
      this.showToast(`Test kaydedildi: ${net} Net! +100 XP`, 'fa-circle-check', 'text-emerald-500');
    }

    this.saveState();
    this.closeTaskModal();
    this.renderAllViews();
  }

  toggleTaskQuick(taskId) {
    if (this.state.completedTasks[taskId]) {
      delete this.state.completedTasks[taskId];
      delete this.state.testResults[taskId];
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
      const dEl = document.getElementById(`sub-d-${s.id}`);
      const yEl = document.getElementById(`sub-y-${s.id}`);
      const bEl = document.getElementById(`sub-b-${s.id}`);
      const netEl = document.getElementById(`sub-net-${s.id}`);
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

  calcDenemeModalTotalNet() {
    let totalD = 0;
    let totalY = 0;
    let totalB = 0;
    let totalNet = 0;

    this.denemeSubjects.forEach(s => {
      const d = parseFloat(document.getElementById(`sub-d-${s.id}`)?.value) || 0;
      const y = parseFloat(document.getElementById(`sub-y-${s.id}`)?.value) || 0;
      const b = parseFloat(document.getElementById(`sub-b-${s.id}`)?.value) || 0;
      const net = Math.max(0, d - (y / 4));

      totalD += d;
      totalY += y;
      totalB += b;
      totalNet += net;

      const netEl = document.getElementById(`sub-net-${s.id}`);
      if (netEl) netEl.textContent = `${net.toFixed(2)} N`;
    });

    document.getElementById('deneme-total-d-y').textContent = `${totalD} Doğru • ${totalY} Yanlış • ${totalB} Boş`;
    document.getElementById('deneme-total-net-display').textContent = `${totalNet.toFixed(2)} Net`;
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
    let totalD = 0;
    let totalY = 0;
    let totalB = 0;
    let totalNet = 0;

    this.denemeSubjects.forEach(s => {
      const d = parseInt(document.getElementById(`sub-d-${s.id}`)?.value) || 0;
      const y = parseInt(document.getElementById(`sub-y-${s.id}`)?.value) || 0;
      const b = parseInt(document.getElementById(`sub-b-${s.id}`)?.value) || 0;
      const net = Math.max(0, Math.round((d - (y / 4)) * 100) / 100);

      subjects[s.id] = { d, y, b, net };
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
  openUploadQuestionModal() {
    this.currentUploadImageBase64 = null;
    document.getElementById('upload-q-title').value = '';
    document.getElementById('upload-q-note').value = '';
    document.getElementById('upload-q-file').value = '';
    document.getElementById('upload-q-preview-container').classList.add('hidden');
    document.getElementById('modal-upload-question').classList.remove('hidden');
  }

  closeUploadQuestionModal() {
    document.getElementById('modal-upload-question').classList.add('hidden');
    this.currentUploadImageBase64 = null;
  }

  previewQuestionImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentUploadImageBase64 = e.target.result;
      const previewImg = document.getElementById('upload-q-preview-img');
      previewImg.src = e.target.result;
      document.getElementById('upload-q-preview-container').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  async saveUploadedQuestion() {
    const book = document.getElementById('upload-q-book')?.value || '';
    const title = (document.getElementById('upload-q-title')?.value || '').trim();
    const note = (document.getElementById('upload-q-note')?.value || '').trim();

    if (!title) {
      alert("Lütfen sayfa ve soru numarasını giriniz.");
      return;
    }

    const questionEntry = {
      id: `q-${Date.now()}`,
      book: book,
      title: title,
      note: note,
      imageBase64: this.currentUploadImageBase64,
      date: new Date().toISOString().split('T')[0],
      solved: false
    };

    if (!this.state.questions) this.state.questions = [];
    this.state.questions.push(questionEntry);

    this.saveState();
    this.closeUploadQuestionModal();
    this.renderQuestionsView();
    this.showToast('Soru havuzuna eklendi!', 'fa-camera', 'text-indigo-500');

    if (this.state.cloudSettings.scriptUrl && this.currentUploadImageBase64) {
      try {
        fetch(this.state.cloudSettings.scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'uploadQuestion',
            imageData: this.currentUploadImageBase64,
            fileName: `Deniz_${book}_${title}.jpg`,
            notes: note
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
