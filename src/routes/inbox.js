const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Archive, Categorie, Service, User } = require('../models');
const { requireAuth, requireAdmin, logAction } = require('../middleware/auth');
const moment = require('moment');
moment.locale('fr');

// Boîte de réception = archives entrantes
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const perPage = 20;
    const offset = (parseInt(page) - 1) * perPage;

    const { count, rows: archives } = await Archive.findAndCountAll({
      where: {
        type_document: 'entrant',
        statut: { [Op.notIn]: ['corbeille', 'supprime'] }
      },
      include: [
        { model: Categorie, as: 'categorie', attributes: ['nom', 'couleur'] },
        { model: Service, as: 'service', attributes: ['nom'] },
        { model: User, as: 'createur', attributes: ['nom', 'prenom'] }
      ],
      order: [['created_at', 'DESC']],
      limit: perPage,
      offset
    });

    const [countEntrant, countSortant, countInterne] = await Promise.all([
      Archive.count({ where: { type_document: 'entrant', statut: 'actif' } }),
      Archive.count({ where: { type_document: 'sortant', statut: 'actif' } }),
      Archive.count({ where: { type_document: 'interne', statut: 'actif' } })
    ]);

    res.render('inbox/index', {
      title: 'Boîte de réception - COG Archive',
      archives,
      compteurs: { entrant: countEntrant, sortant: countSortant, interne: countInterne },
      pagination: { current: parseInt(page), total: Math.ceil(count / perPage), count },
      moment,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Erreur inbox:', err);
    req.flash('error', 'Erreur de chargement.');
    res.redirect('/dashboard');
  }
});

// Marquer comme traité
router.post('/:id/traiter', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Archive.update(
      { statut: 'archive', updated_by: req.session.user.id },
      { where: { id: req.params.id } }
    );
    await logAction(req.session.user.id, 'modification', 'archives', req.params.id, { action: 'traitement' }, req);
    req.flash('success', 'Document marqué comme traité.');
  } catch (err) {
    req.flash('error', 'Erreur lors du traitement.');
  }
  res.redirect('/boite-reception');
});

module.exports = router;
