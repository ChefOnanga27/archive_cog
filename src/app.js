require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const moment = require('moment');
moment.locale('fr');

const { sequelize } = require('./models');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// ============================================================
// CONFIGURATION
// ============================================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(methodOverride('_method'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'cog-archive-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000, // 8 heures
    httpOnly: true
  }
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.notifications = [];
  res.locals.notifCount = 0;
  res.locals.moment = moment;
  res.locals.currentPath = req.path;
  next();
});

const { loadNotifications } = require('./middleware/auth');
app.use(loadNotifications);

// Socket.io
io.on('connection', (socket) => {
  socket.on('join-room', (userId) => socket.join(`user-${userId}`));
  socket.on('disconnect', () => {});
});
app.set('io', io);

// ============================================================
// ROUTES
// ============================================================
app.use('/auth', require('./routes/auth'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/boite-reception', require('./routes/inbox'));
app.use('/archives', require('./routes/archives'));
app.use('/utilisateurs', require('./routes/users'));
app.use('/historique', require('./routes/historique'));
app.use('/parametres', require('./routes/settings'));
app.use('/profil', require('./routes/profile'));

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/auth/login');
});

// API Notifications
const { requireAuth } = require('./middleware/auth');
const { Notification } = require('./models');

app.get('/api/notifications', requireAuth, async (req, res) => {
  const notifs = await Notification.findAll({
    where: { user_id: req.session.user.id },
    order: [['created_at', 'DESC']],
    limit: 20
  });
  res.json(notifs);
});

app.post('/api/notifications/:id/lire', requireAuth, async (req, res) => {
  await Notification.update({ lue: true }, { where: { id: req.params.id } });
  res.json({ success: true });
});

app.post('/api/notifications/lire-toutes', requireAuth, async (req, res) => {
  await Notification.update({ lue: true }, { where: { user_id: req.session.user.id } });
  res.json({ success: true });
});

// 404
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page introuvable - COG Archive',
    code: 404,
    message: 'La page que vous recherchez n\'existe pas.',
    error: [], success: []
  });
});

// Erreurs générales
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Erreur serveur - COG Archive',
    code: 500,
    message: 'Une erreur interne s\'est produite.',
    error: [], success: []
  });
});

// ============================================================
// DÉMARRAGE
// ============================================================
const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion à la base MySQL établie.');

    await sequelize.sync({ alter: false });
    console.log('✅ Modèles synchronisés avec la base de données.');

    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════╗
║     COMITÉ OLYMPIQUE GABONAIS - ARCHIVES       ║
║         Système d'Archivage Numérique          ║
╠════════════════════════════════════════════════╣
║  Base de données : MySQL (Sequelize)           ║
║  Serveur démarré sur le port ${PORT}             ║
║  URL: http://localhost:${PORT}                   ║
╚════════════════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('❌ Impossible de se connecter à la base de données MySQL.');
    console.error(err.message);
    console.error('\nVérifiez votre fichier .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)');
    console.error('Avez-vous lancé "npm run seed" après avoir créé la base ?\n');
    process.exit(1);
  }
};

start();
