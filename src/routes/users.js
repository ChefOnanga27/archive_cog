const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { requireAuth, requireSuperAdmin, logAction } = require('../middleware/auth');
const moment = require('moment');
moment.locale('fr');

// Liste des utilisateurs
router.get('/', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const users = await User.findAll({ order: [['nom', 'ASC']] });
    res.render('users/index', {
      title: 'Gestion des utilisateurs - COG Archive',
      users,
      moment,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    req.flash('error', 'Erreur de chargement.');
    res.redirect('/dashboard');
  }
});

// Formulaire création
router.get('/creer', requireAuth, requireSuperAdmin, (req, res) => {
  res.render('users/form', {
    title: 'Nouvel utilisateur - COG Archive',
    user_edit: {},
    action: '/utilisateurs', method: 'POST',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// Création
router.post('/', requireAuth, requireSuperAdmin, async (req, res) => {
  const { nom, prenom, email, password, role, service } = req.body;

  if (!nom || !prenom || !email || !password || !role) {
    req.flash('error', 'Tous les champs obligatoires doivent être remplis.');
    return res.redirect('/utilisateurs/creer');
  }

  try {
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      req.flash('error', 'Cet email est déjà utilisé.');
      return res.redirect('/utilisateurs/creer');
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      nom: nom.trim(),
      prenom: prenom.trim(),
      email: email.toLowerCase().trim(),
      password_hash: hash,
      role,
      service: service?.trim()
    });

    await logAction(req.session.user.id, 'ajout', 'users', user.id, { email, role }, req);
    req.flash('success', `Utilisateur ${prenom} ${nom} créé avec succès.`);
    res.redirect('/utilisateurs');
  } catch (err) {
    console.error(err);
    req.flash('error', `Erreur: ${err.message}`);
    res.redirect('/utilisateurs/creer');
  }
});

// Formulaire modification
router.get('/:id/modifier', requireAuth, requireSuperAdmin, async (req, res) => {
  const user_edit = await User.findByPk(req.params.id);
  if (!user_edit) { req.flash('error', 'Utilisateur introuvable.'); return res.redirect('/utilisateurs'); }
  res.render('users/form', {
    title: `Modifier ${user_edit.prenom} ${user_edit.nom}`,
    user_edit,
    action: `/utilisateurs/${req.params.id}?_method=PUT`, method: 'POST',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// Mise à jour
router.put('/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  const { nom, prenom, email, role, service, actif, new_password } = req.body;
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      req.flash('error', 'Utilisateur introuvable.');
      return res.redirect('/utilisateurs');
    }

    const updates = {
      nom: nom?.trim(), prenom: prenom?.trim(),
      email: email?.toLowerCase().trim(),
      role, service: service?.trim(),
      actif: actif === 'true'
    };

    if (new_password && new_password.length >= 8) {
      updates.password_hash = await bcrypt.hash(new_password, 10);
    }

    await user.update(updates);

    await logAction(req.session.user.id, 'modification', 'users', req.params.id, { role }, req);
    req.flash('success', 'Utilisateur modifié avec succès.');
    res.redirect('/utilisateurs');
  } catch (err) {
    req.flash('error', `Erreur: ${err.message}`);
    res.redirect(`/utilisateurs/${req.params.id}/modifier`);
  }
});

// Désactiver/activer utilisateur
router.post('/:id/toggle-actif', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      req.flash('error', 'Utilisateur introuvable.');
      return res.redirect('/utilisateurs');
    }
    const wasActif = user.actif;
    await user.update({ actif: !wasActif });
    req.flash('success', `Utilisateur ${wasActif ? 'désactivé' : 'activé'} avec succès.`);
  } catch (err) {
    req.flash('error', 'Erreur serveur.');
  }
  res.redirect('/utilisateurs');
});

module.exports = router;
