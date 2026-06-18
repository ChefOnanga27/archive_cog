const { Historique } = require('../models');

// Middleware: vérification authentification
const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
    return next();
  }
  req.flash('error', 'Veuillez vous connecter pour accéder à cette page.');
  res.redirect('/auth/login');
};

// Middleware: vérification rôle admin (super_admin ou archiviste)
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.user &&
      (req.session.user.role === 'super_admin' || req.session.user.role === 'archiviste')) {
    return next();
  }
  req.flash('error', 'Accès refusé. Permissions insuffisantes.');
  res.redirect('/dashboard');
};

// Middleware: super admin seulement
const requireSuperAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'super_admin') {
    return next();
  }
  req.flash('error', 'Accès refusé. Réservé au super administrateur.');
  res.redirect('/dashboard');
};

// Middleware: chargement des notifications non lues
const loadNotifications = async (req, res, next) => {
  if (req.session && req.session.user) {
    try {
      const { Notification } = require('../models');
      const notifs = await Notification.findAll({
        where: { user_id: req.session.user.id, lue: false },
        order: [['created_at', 'DESC']],
        limit: 10
      });
      res.locals.notifications = notifs;
      res.locals.notifCount = notifs.length;
    } catch (e) {
      res.locals.notifications = [];
      res.locals.notifCount = 0;
    }
  }
  next();
};

// Journaliser une action dans l'historique
const logAction = async (userId, action, entite, entiteId, details, req) => {
  try {
    await Historique.create({
      user_id: userId,
      action,
      entite,
      entite_id: entiteId || null,
      details,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('user-agent')
    });
  } catch (e) {
    console.error('Erreur journalisation:', e.message);
  }
};

module.exports = { requireAuth, requireAdmin, requireSuperAdmin, loadNotifications, logAction };
