const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { logAction } = require('../middleware/auth');

// GET /auth/login
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', {
    title: 'Connexion - COG Archive',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    req.flash('error', 'Email et mot de passe requis.');
    return res.redirect('/auth/login');
  }

  try {
    const user = await User.findOne({
      where: { email: email.toLowerCase().trim(), actif: true }
    });

    if (!user) {
      req.flash('error', 'Identifiants incorrects.');
      return res.redirect('/auth/login');
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      req.flash('error', 'Identifiants incorrects.');
      return res.redirect('/auth/login');
    }

    await user.update({ derniere_connexion: new Date() });

    req.session.user = {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
      service: user.service,
      avatar: user.avatar
    };

    await logAction(user.id, 'connexion', 'users', user.id, { email: user.email }, req);

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Erreur login:', err);
    req.flash('error', 'Erreur serveur. Veuillez réessayer.');
    res.redirect('/auth/login');
  }
});

// GET /auth/logout
router.get('/logout', async (req, res) => {
  if (req.session.user) {
    await logAction(req.session.user.id, 'deconnexion', 'users', req.session.user.id, {}, req);
  }
  req.session.destroy(() => res.redirect('/auth/login'));
});

// GET /auth/forgot-password
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Mot de passe oublié - COG Archive',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    await User.findOne({ where: { email } });
    // Toujours afficher le même message pour la sécurité (pas de fuite d'info)
    req.flash('success', 'Si cet email existe, un lien de réinitialisation a été envoyé.');
    res.redirect('/auth/forgot-password');
  } catch (err) {
    req.flash('error', 'Erreur serveur.');
    res.redirect('/auth/forgot-password');
  }
});

// GET /auth/change-password
router.get('/change-password', (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  res.render('auth/change-password', {
    title: 'Changer le mot de passe - COG Archive',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// POST /auth/change-password
router.post('/change-password', async (req, res) => {
  if (!req.session.user) return res.redirect('/auth/login');
  const { current_password, new_password, confirm_password } = req.body;

  if (new_password !== confirm_password) {
    req.flash('error', 'Les nouveaux mots de passe ne correspondent pas.');
    return res.redirect('/auth/change-password');
  }

  if (new_password.length < 8) {
    req.flash('error', 'Le nouveau mot de passe doit contenir au moins 8 caractères.');
    return res.redirect('/auth/change-password');
  }

  try {
    const user = await User.findByPk(req.session.user.id);
    const valid = await bcrypt.compare(current_password, user.password_hash);

    if (!valid) {
      req.flash('error', 'Mot de passe actuel incorrect.');
      return res.redirect('/auth/change-password');
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await user.update({ password_hash: newHash });

    req.flash('success', 'Mot de passe modifié avec succès.');
    res.redirect('/auth/change-password');
  } catch (err) {
    req.flash('error', 'Erreur serveur.');
    res.redirect('/auth/change-password');
  }
});

module.exports = router;
