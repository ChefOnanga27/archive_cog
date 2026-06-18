// COG Archive - Main JavaScript
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initNotifications();
  initDropdowns();
  initFlashAlerts();
  initFileUpload();
  initScrollTop();
  initConfirmDialogs();
  initSearchGlobal();
  initSidebarMobile();
  
  // Socket.io temps réel (si disponible)
  if (typeof io !== 'undefined' && window.cogUserId) {
    const socket = io();
    socket.emit('join-room', window.cogUserId);
    socket.on('notification', (data) => {
      showToast(data.message, data.type || 'info');
      updateNotifBadge();
    });
  }
});

// ============================================================
// NOTIFICATIONS
// ============================================================
function initNotifications() {
  const btn = document.getElementById('notif-btn');
  const panel = document.getElementById('notif-panel');
  if (!btn || !panel) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) loadNotifications();
  });

  document.addEventListener('click', (e) => {
    if (!panel.contains(e.target) && e.target !== btn) {
      panel.classList.remove('open');
    }
  });
}

async function loadNotifications() {
  const container = document.getElementById('notif-list');
  if (!container) return;
  
  try {
    const res = await fetch('/api/notifications');
    const notifs = await res.json();
    
    if (notifs.length === 0) {
      container.innerHTML = '<div class="notif-empty"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><p>Aucune nouvelle notification</p></div>';
    } else {
      container.innerHTML = notifs.map(n => `
        <div class="notif-item ${!n.lue ? 'unread' : ''}" data-id="${n.id}" onclick="markNotifRead('${n.id}', '${n.lien || ''}')">
          <div class="notif-title">${n.titre}</div>
          <div class="notif-msg">${n.message}</div>
          <div class="notif-time">${timeAgo(n.created_at)}</div>
        </div>
      `).join('');
    }
  } catch (e) {
    console.error('Erreur chargement notifications:', e);
  }
}

async function markNotifRead(id, lien) {
  try {
    await fetch(`/api/notifications/${id}/lire`, { method: 'POST' });
    updateNotifBadge();
    if (lien) window.location.href = lien;
  } catch (e) {}
}

async function markAllRead() {
  try {
    await fetch('/api/notifications/lire-toutes', { method: 'POST' });
    updateNotifBadge();
    loadNotifications();
  } catch (e) {}
}

async function updateNotifBadge() {
  try {
    const res = await fetch('/api/notifications');
    const notifs = await res.json();
    const unread = notifs.filter(n => !n.lue).length;
    const badge = document.querySelector('.notif-badge');
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }
  } catch (e) {}
}

// ============================================================
// DROPDOWNS
// ============================================================
function initDropdowns() {
  document.querySelectorAll('[data-toggle="dropdown"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = btn.nextElementSibling;
      if (menu) menu.classList.toggle('open');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
  });
}

// ============================================================
// FLASH ALERTS
// ============================================================
function initFlashAlerts() {
  document.querySelectorAll('.alert-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.alert').remove();
    });
  });

  // Auto-fermeture après 5 secondes
  document.querySelectorAll('.alert.auto-close').forEach(alert => {
    setTimeout(() => alert.remove(), 5000);
  });
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
  const icons = {
    success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
    warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
  };

  const toast = document.createElement('div');
  toast.className = `alert alert-${type} auto-close`;
  toast.style.cssText = 'position:fixed;top:80px;right:20px;z-index:2000;min-width:300px;max-width:400px;animation:slideIn 0.3s ease';
  toast.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[type] || icons.info}</svg>
    <span>${message}</span>
    <button class="alert-close" onclick="this.parentNode.remove()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// ============================================================
// UPLOAD DE FICHIERS
// ============================================================
function initFileUpload() {
  const areas = document.querySelectorAll('.file-upload-area');
  areas.forEach(area => {
    const input = area.querySelector('input[type="file"]') || area.nextElementSibling;
    
    area.addEventListener('click', () => {
      if (input) input.click();
    });

    area.addEventListener('dragover', (e) => {
      e.preventDefault();
      area.classList.add('drag-over');
    });

    area.addEventListener('dragleave', () => area.classList.remove('drag-over'));

    area.addEventListener('drop', (e) => {
      e.preventDefault();
      area.classList.remove('drag-over');
      if (input && e.dataTransfer.files.length > 0) {
        input.files = e.dataTransfer.files;
        updateFileList(input);
      }
    });

    if (input) {
      input.addEventListener('change', () => updateFileList(input));
    }
  });
}

function updateFileList(input) {
  const container = document.getElementById('file-list');
  if (!container) return;
  
  const files = Array.from(input.files);
  if (files.length === 0) { container.innerHTML = ''; return; }
  
  container.innerHTML = files.map(f => {
    const size = f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`;
    const ext = f.name.split('.').pop().toLowerCase();
    const iconClass = ext === 'pdf' ? 'pdf' : ['docx','doc'].includes(ext) ? 'docx' : ['xlsx','xls'].includes(ext) ? 'xlsx' : 'img';
    return `
      <div class="file-item">
        <div class="file-icon ${iconClass}">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="file-info">
          <div class="file-name">${f.name}</div>
          <div class="file-size">${size}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// SCROLL TO TOP
// ============================================================
function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;
  
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 300);
  });
  
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ============================================================
// CONFIRM DIALOGS
// ============================================================
function initConfirmDialogs() {
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', (e) => {
      const msg = el.getAttribute('data-confirm');
      if (!confirm(msg)) e.preventDefault();
    });
  });

  // Forms avec confirmation
  document.querySelectorAll('form[data-confirm]').forEach(form => {
    form.addEventListener('submit', (e) => {
      const msg = form.getAttribute('data-confirm');
      if (!confirm(msg)) e.preventDefault();
    });
  });
}

// ============================================================
// RECHERCHE GLOBALE
// ============================================================
function initSearchGlobal() {
  const input = document.getElementById('search-global');
  if (!input) return;
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      window.location.href = `/archives?search=${encodeURIComponent(input.value.trim())}`;
    }
  });
}

// ============================================================
// SIDEBAR MOBILE
// ============================================================
function initSidebarMobile() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  
  if (!toggle || !sidebar) return;
  
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
  
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && !sidebar.contains(e.target) && e.target !== toggle) {
      sidebar.classList.remove('open');
    }
  });
}

// ============================================================
// GRAPHIQUES (Chart.js)
// ============================================================
function initCharts(moisData, categorieData) {
  // Graphique mensuel
  const ctxMois = document.getElementById('chart-mois');
  if (ctxMois && moisData) {
    new Chart(ctxMois, {
      type: 'bar',
      data: {
        labels: moisData.map(d => d.mois),
        datasets: [{
          label: 'Archives',
          data: moisData.map(d => d.count),
          backgroundColor: '#0057A8',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#f0f0f0' }, ticks: { font: { family: 'Poppins', size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { family: 'Poppins', size: 11 } } }
        }
      }
    });
  }

  // Graphique catégories
  const ctxCat = document.getElementById('chart-categories');
  if (ctxCat && categorieData && categorieData.length > 0) {
    new Chart(ctxCat, {
      type: 'doughnut',
      data: {
        labels: categorieData.map(d => d.nom),
        datasets: [{
          data: categorieData.map(d => d.count),
          backgroundColor: ['#0057A8', '#009A44', '#F4C300', '#CE1126', '#003F7D', '#007B36', '#DDB000', '#7B1522'],
          borderWidth: 3,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Poppins', size: 11 }, padding: 16 }
          }
        }
      }
    });
  }
}

// ============================================================
// UTILITAIRES
// ============================================================
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'À l\'instant';
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `Il y a ${Math.floor(diff / 86400000)} jours`;
  return date.toLocaleDateString('fr-FR');
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// Style animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);
