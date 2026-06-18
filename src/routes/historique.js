const express = require('express');
const router = express.Router();
const { Historique, User } = require('../models');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const moment = require('moment');
moment.locale('fr');

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, action, user_id } = req.query;
    const perPage = 25;
    const offset = (parseInt(page) - 1) * perPage;

    const where = {};
    if (action) where.action = action;
    if (user_id) where.user_id = user_id;

    const { count, rows: historique } = await Historique.findAndCountAll({
      where,
      include: [{ model: User, as: 'utilisateur', attributes: ['nom', 'prenom', 'role'] }],
      order: [['created_at', 'DESC']],
      limit: perPage,
      offset
    });

    const users = await User.findAll({
      where: { actif: true },
      attributes: ['id', 'nom', 'prenom'],
      order: [['nom', 'ASC']]
    });

    res.render('historique/index', {
      title: 'Historique des activités - COG Archive',
      historique,
      users,
      filters: req.query,
      pagination: { current: parseInt(page), total: Math.ceil(count / perPage), count },
      moment,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Erreur de chargement.');
    res.redirect('/dashboard');
  }
});

module.exports = router;
