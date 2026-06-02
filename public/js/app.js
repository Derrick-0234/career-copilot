/* ──────────────────────────────────────────────────────────────────────────
   Career Copilot — shared utilities
   All pages import this file. Window global: CC
────────────────────────────────────────────────────────────────────────── */
const CC = (() => {

  // ─── LocalStorage keys ───────────────────────────────────────────────────
  const KEYS = {
    USERS: 'cc_users',
    CURRENT: 'cc_current',
    PROGRESS: (id) => `cc_progress_${id}`
  };

  // ─── XP / Level system ───────────────────────────────────────────────────
  function xpForLevel(level) {
    return 100 + (level - 1) * 60;
  }

  function levelInfo(totalXP) {
    let level = 1;
    let xpUsed = 0;
    while (true) {
      const needed = xpForLevel(level);
      if (xpUsed + needed > totalXP) break;
      xpUsed += needed;
      level++;
    }
    const xpInLevel = totalXP - xpUsed;
    const xpForNext = xpForLevel(level);
    return { level, xpInLevel, xpForNext, pct: Math.round((xpInLevel / xpForNext) * 100) };
  }

  // ─── Date helpers ─────────────────────────────────────────────────────────
  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function isYesterday(dateStr) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0] === dateStr;
  }

  // ─── Auth helpers ─────────────────────────────────────────────────────────
  function getUsers() {
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
  }

  function saveUsers(users) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  function getCurrentUserId() {
    return localStorage.getItem(KEYS.CURRENT);
  }

  function getUser(id) {
    const uid = id || getCurrentUserId();
    if (!uid) return null;
    return getUsers().find(u => u.id === uid) || null;
  }

  function requireAuth() {
    if (!getCurrentUserId()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  }

  function logout() {
    localStorage.removeItem(KEYS.CURRENT);
    window.location.href = '/login.html';
  }

  // ─── Progress helpers ────────────────────────────────────────────────────
  function getProgress(userId) {
    const uid = userId || getCurrentUserId();
    if (!uid) return null;
    const raw = localStorage.getItem(KEYS.PROGRESS(uid));
    return raw ? JSON.parse(raw) : null;
  }

  function saveProgress(progress, userId) {
    const uid = userId || getCurrentUserId();
    if (!uid) return;
    localStorage.setItem(KEYS.PROGRESS(uid), JSON.stringify(progress));
  }

  function defaultProgress() {
    return {
      goal: '',
      timePerDay: '',
      skillLevel: '',
      situation: '',
      enjoyment: [],
      onboardingComplete: false,
      roadmap: null,
      skillTree: [],
      todayQuests: null,
      xp: 0,
      xpHistory: [],
      streak: 0,
      lastActiveDate: null,
      resources: [],
      portfolioBio: null,
      verifiedProofs: [],
      createdAt: Date.now()
    };
  }

  // ─── Streak tracking ─────────────────────────────────────────────────────
  function touchStreak(progress) {
    const t = today();
    if (!progress.lastActiveDate) {
      progress.streak = 1;
    } else if (progress.lastActiveDate === t) {
      // already touched today — no change
    } else if (isYesterday(progress.lastActiveDate)) {
      progress.streak = (progress.streak || 0) + 1;
    } else {
      progress.streak = 1;
    }
    progress.lastActiveDate = t;
    return progress;
  }

  // ─── XP award ────────────────────────────────────────────────────────────
  function awardXP(progress, amount) {
    const before = levelInfo(progress.xp);
    progress.xp += amount;
    const after = levelInfo(progress.xp);

    // Record xp history
    const t = today();
    const last = progress.xpHistory[progress.xpHistory.length - 1];
    if (last && last.date === t) {
      last.earned += amount;
      last.total = progress.xp;
    } else {
      progress.xpHistory.push({ date: t, earned: amount, total: progress.xp });
    }

    return { progress, leveledUp: after.level > before.level, newLevel: after.level };
  }

  // ─── Skill abbreviation ──────────────────────────────────────────────────
  function getSkillIcon(name) {
    const words = (name || '').trim().split(/[\s\/&+.#]+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return (name || '').slice(0, 2).toUpperCase();
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────
  function toast(msg, type = 'default', duration = 3500) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 0.4s ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 400);
    }, duration);
  }

  function showXPPopup(amount, anchorEl) {
    const popup = document.createElement('div');
    popup.className = 'xp-popup';
    popup.textContent = `+${amount} XP`;

    const rect = anchorEl.getBoundingClientRect();
    popup.style.top = `${rect.top + window.scrollY - 10}px`;
    popup.style.left = `${rect.left + rect.width / 2}px`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 1700);
  }

  function showLevelUpModal(level, onClose) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
        <div style="width:56px;height:56px;background:var(--teal);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--font-head);font-size:1.25rem;font-weight:700;color:#fff;margin:0 auto 16px;letter-spacing:-0.02em">LV</div>
        <h2 class="modal-title gradient-text">LEVEL UP!</h2>
        <p class="modal-body">You've reached <strong>Level ${level}</strong>. New skills are unlocking in your skill tree. Keep going.</p>
        <button class="btn btn-primary" style="width:100%" onclick="this.closest('.modal-overlay').remove()">
          Continue →
        </button>
      </div>`;
    document.body.appendChild(overlay);
    confetti();
  }

  function confetti() {
    const colors = ['#1a7a6e', '#2d9b8a', '#145f55', '#ffffff', '#d4d4d4'];
    for (let i = 0; i < 36; i++) {
      const el = document.createElement('div');
      el.style.cssText = `
        position: fixed;
        width: ${Math.random() * 7 + 3}px;
        height: ${Math.random() * 7 + 3}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        top: ${Math.random() * 60 + 20}%;
        left: ${Math.random() * 80 + 10}%;
        pointer-events: none;
        z-index: 9999;
        animation: confettiFloat ${Math.random() * 1.5 + 1}s ease forwards ${Math.random() * 0.5}s;
      `;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }
  }

  function renderNavUser() {
    const user = getUser();
    if (!user) return;
    const els = document.querySelectorAll('[data-nav-user]');
    els.forEach(el => {
      el.textContent = user.name.split(' ')[0];
    });
    const avs = document.querySelectorAll('[data-nav-avatar]');
    avs.forEach(el => {
      el.textContent = user.name.charAt(0).toUpperCase();
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return {
    levelInfo, xpForLevel, today, isYesterday,
    getUsers, saveUsers, getCurrentUserId, getUser, requireAuth, logout,
    getProgress, saveProgress, defaultProgress,
    touchStreak, awardXP,
    getSkillIcon, toast, showXPPopup, showLevelUpModal, confetti, renderNavUser,
    KEYS
  };
})();
