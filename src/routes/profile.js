const express = require('express');
const router = express.Router();
const { User, Archive, Historique } = require('../models');
const { requireAuth, logAction } = require('../middleware/auth');
const moment = require('moment');
moment.locale('fr');

router.get('/', requireAuth, async (req, res) => {
  try {
    const profile = await User.findByPk(req.session.user.id);

    const archivesCreees = await Archive.count({
      where: { created_by: req.session.user.id, statut: { [require('sequelize').Op.ne]: 'supprime' } }
    });

    const actionsTotal = await Historique.count({ where: { user_id: req.session.user.id } });

    const dernieresActions = await Historique.findAll({
      where: { user_id: req.session.user.id },
      order: [['created_at', 'DESC']],
      limit: 8
    });

    res.render('profile/index', {
      title: 'Mon profil - COG Archive',
      profile,
      stats: { archivesCreees, actionsTotal },
      dernieresActions,
      moment,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Erreur de chargement du profil.');
    res.redirect('/dashboard');
  }
});

router.put('/', requireAuth, async (req, res) => {
  const { nom, prenom, service } = req.body;
  try {
    const user = await User.findByPk(req.session.user.id);
    await user.update({ nom: nom?.trim(), prenom: prenom?.trim(), service: service?.trim() });

    req.session.user.nom = nom;
    req.session.user.prenom = prenom;
    req.session.user.service = service;

    await logAction(req.session.user.id, 'modification', 'users', req.session.user.id, { profil: true }, req);
    req.flash('success', 'Profil mis à jour avec succès.');
  } catch (err) {
    req.flash('error', 'Erreur lors de la mise à jour.');
  }
  res.redirect('/profil');
});

module.exports = router;
