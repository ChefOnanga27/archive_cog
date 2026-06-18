const express = require('express');
const router = express.Router();
const { Op, fn, col } = require('sequelize');
const { Archive, User, Categorie, Historique, sequelize } = require('../models');
const { requireAuth } = require('../middleware/auth');
const moment = require('moment');
moment.locale('fr');

router.get('/', requireAuth, async (req, res) => {
  try {
    const [
      totalArchives,
      archivesActives,
      archivesEnAttente,
      totalUsers,
      corbeille
    ] = await Promise.all([
      Archive.count({ where: { statut: { [Op.ne]: 'supprime' } } }),
      Archive.count({ where: { statut: 'actif' } }),
      Archive.count({ where: { statut: 'archive' } }),
      User.count({ where: { actif: true } }),
      Archive.count({ where: { statut: 'corbeille' } })
    ]);

    // Archives récentes
    const archivesRecentes = await Archive.findAll({
      where: { statut: { [Op.ne]: 'supprime' } },
      include: [
        { model: Categorie, as: 'categorie', attributes: ['nom', 'couleur'] },
        { model: require('../models').Service, as: 'service', attributes: ['nom'] },
        { model: User, as: 'createur', attributes: ['nom', 'prenom'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 8
    });

    // Archives par catégorie
    const categoriesAll = await Categorie.findAll();
    const categorieStats = [];
    for (const cat of categoriesAll) {
      const count = await Archive.count({
        where: { categorie_id: cat.id, statut: { [Op.ne]: 'supprime' } }
      });
      if (count > 0) categorieStats.push({ nom: cat.nom, couleur: cat.couleur, count });
    }

    // Archives par mois (6 derniers mois)
    const moisStats = [];
    for (let i = 5; i >= 0; i--) {
      const debut = moment().subtract(i, 'months').startOf('month').toDate();
      const fin = moment().subtract(i, 'months').endOf('month').toDate();
      const count = await Archive.count({
        where: {
          created_at: { [Op.between]: [debut, fin] },
          statut: { [Op.ne]: 'supprime' }
        }
      });
      moisStats.push({ mois: moment().subtract(i, 'months').format('MMM'), count });
    }

    // Activités récentes
    const activitesRecentes = await Historique.findAll({
      include: [{ model: User, as: 'utilisateur', attributes: ['nom', 'prenom', 'role'] }],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    res.render('dashboard/index', {
      title: 'Tableau de bord - COG Archive',
      stats: { totalArchives, archivesActives, archivesEnAttente, totalUsers, corbeille },
      archivesRecentes,
      categorieStats,
      moisStats,
      activitesRecentes,
      moment,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Erreur dashboard:', err);
    res.render('dashboard/index', {
      title: 'Tableau de bord - COG Archive',
      stats: { totalArchives: 0, archivesActives: 0, archivesEnAttente: 0, totalUsers: 0, corbeille: 0 },
      archivesRecentes: [], categorieStats: [], moisStats: [], activitesRecentes: [],
      moment,
      error: ['Erreur de chargement des données'],
      success: []
    });
  }
});

module.exports = router;
