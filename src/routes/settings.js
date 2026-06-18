const express = require('express');
const router = express.Router();
const { Categorie, Service } = require('../models');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const moment = require('moment');
moment.locale('fr');

// Catégories
router.get('/categories', requireAuth, requireSuperAdmin, async (req, res) => {
  const categories = await Categorie.findAll({ order: [['nom', 'ASC']] });
  res.render('settings/categories', {
    title: 'Catégories - Paramètres',
    categories,
    error: req.flash('error'),
    success: req.flash('success')
  });
});

router.post('/categories', requireAuth, requireSuperAdmin, async (req, res) => {
  const { nom, description, couleur, icone } = req.body;
  try {
    await Categorie.create({ nom, description, couleur: couleur || '#0057A8', icone });
    req.flash('success', 'Catégorie créée avec succès.');
  } catch (err) {
    req.flash('error', `Erreur: ${err.message}`);
  }
  res.redirect('/parametres/categories');
});

router.delete('/categories/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    await Categorie.destroy({ where: { id: req.params.id } });
    req.flash('success', 'Catégorie supprimée.');
  } catch (err) {
    req.flash('error', 'Erreur lors de la suppression.');
  }
  res.redirect('/parametres/categories');
});

// Services
router.get('/services', requireAuth, requireSuperAdmin, async (req, res) => {
  const services = await Service.findAll({ order: [['nom', 'ASC']] });
  res.render('settings/services', {
    title: 'Services - Paramètres',
    services,
    error: req.flash('error'),
    success: req.flash('success')
  });
});

router.post('/services', requireAuth, requireSuperAdmin, async (req, res) => {
  const { nom, description, responsable } = req.body;
  try {
    await Service.create({ nom, description, responsable });
    req.flash('success', 'Service créé avec succès.');
  } catch (err) {
    req.flash('error', `Erreur: ${err.message}`);
  }
  res.redirect('/parametres/services');
});

router.delete('/services/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  try {
    await Service.destroy({ where: { id: req.params.id } });
    req.flash('success', 'Service supprimé.');
  } catch (err) {
    req.flash('error', 'Erreur lors de la suppression.');
  }
  res.redirect('/parametres/services');
});

module.exports = router;
