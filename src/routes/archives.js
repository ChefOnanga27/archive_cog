const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Archive, Categorie, Service, User, Fichier, Historique, Notification, sequelize } = require('../models');
const { requireAuth, requireAdmin, logAction } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
moment.locale('fr');

// Config multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.xlsx', '.jpg', '.jpeg', '.png', '.doc', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Format de fichier non autorisé'));
  }
});

// Helper: générer référence unique
const genererReference = async () => {
  const annee = new Date().getFullYear();
  const count = await Archive.count();
  const num = String(count + 1).padStart(5, '0');
  return `COG-${annee}-${num}`;
};

// Helper: données communes (catégories, services)
const getDonneesCommunes = async () => {
  const [categories, services] = await Promise.all([
    Categorie.findAll({ order: [['nom', 'ASC']] }),
    Service.findAll({ order: [['nom', 'ASC']] })
  ]);
  return { categories, services };
};

// Helper: inclusions standards pour la liste
const includesListe = [
  { model: Categorie, as: 'categorie', attributes: ['nom', 'couleur'] },
  { model: Service, as: 'service', attributes: ['nom'] },
  { model: User, as: 'createur', attributes: ['nom', 'prenom'] }
];

// Helper: applique la restriction de confidentialité pour le rôle consultation
const appliquerRestrictionConfidentialite = (where, role) => {
  if (role === 'consultation') {
    if (where.confidentialite && where.confidentialite !== 'secret') {
      // un filtre précis a été demandé et n'est pas "secret" -> on laisse tel quel
    } else {
      where.confidentialite = { [Op.ne]: 'secret' };
    }
  }
  return where;
};

// ============================================================
// LISTE DES ARCHIVES
// ============================================================
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, categorie, service, type, confidentialite, statut, date_debut, date_fin, page = 1 } = req.query;
    const perPage = 15;
    const offset = (parseInt(page) - 1) * perPage;

    const where = {
      statut: { [Op.notIn]: ['corbeille', 'supprime'] }
    };

    if (search) {
      where[Op.or] = [
        { titre: { [Op.like]: `%${search}%` } },
        { reference: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (categorie) where.categorie_id = categorie;
    if (service) where.service_id = service;
    if (type) where.type_document = type;
    if (confidentialite) where.confidentialite = confidentialite;
    if (statut) where.statut = statut;
    if (date_debut || date_fin) {
      where.date_document = {};
      if (date_debut) where.date_document[Op.gte] = date_debut;
      if (date_fin) where.date_document[Op.lte] = date_fin;
    }

    appliquerRestrictionConfidentialite(where, req.session.user.role);

    const { count, rows: archives } = await Archive.findAndCountAll({
      where,
      include: includesListe,
      order: [['created_at', 'DESC']],
      limit: perPage,
      offset,
      distinct: true
    });

    const { categories, services } = await getDonneesCommunes();
    const totalPages = Math.ceil(count / perPage);

    res.render('archives/index', {
      title: 'Archives numériques - COG Archive',
      archives,
      categories, services,
      filters: req.query,
      pagination: { current: parseInt(page), total: totalPages, count },
      moment,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Erreur liste archives:', err);
    req.flash('error', 'Erreur de chargement des archives.');
    res.redirect('/dashboard');
  }
});

// ============================================================
// FORMULAIRE CRÉATION
// ============================================================
router.get('/creer', requireAuth, requireAdmin, async (req, res) => {
  const { categories, services } = await getDonneesCommunes();
  const reference = await genererReference();
  res.render('archives/form', {
    title: 'Nouvelle archive - COG Archive',
    archive: { reference },
    categories, services,
    action: '/archives', method: 'POST',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// ============================================================
// CRÉATION
// ============================================================
router.post('/', requireAuth, requireAdmin, upload.array('fichiers', 10), async (req, res) => {
  const { reference, titre, description, categorie_id, service_id, type_document,
          confidentialite, date_document, date_reception, expediteur, destinataire, tags } = req.body;

  if (!titre || !reference) {
    req.flash('error', 'La référence et le titre sont obligatoires.');
    return res.redirect('/archives/creer');
  }

  try {
    const qrData = `COG-ARCHIVE:${reference}:${titre}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const archive = await Archive.create({
      reference: reference.trim(),
      titre: titre.trim(),
      description: description?.trim(),
      categorie_id: categorie_id || null,
      service_id: service_id || null,
      type_document: type_document || 'interne',
      confidentialite: confidentialite || 'normal',
      statut: 'actif',
      date_document: date_document || null,
      date_reception: date_reception || null,
      expediteur: expediteur?.trim(),
      destinataire: destinataire?.trim(),
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      qr_code: qrCode,
      created_by: req.session.user.id,
      updated_by: req.session.user.id
    });

    if (req.files && req.files.length > 0) {
      const fichierInserts = req.files.map(f => ({
        archive_id: archive.id,
        nom_original: f.originalname,
        nom_stockage: f.filename,
        chemin: `/uploads/${f.filename}`,
        type_mime: f.mimetype,
        taille: f.size
      }));
      await Fichier.bulkCreate(fichierInserts);
    }

    await logAction(req.session.user.id, 'ajout', 'archives', archive.id, { reference, titre }, req);

    await Notification.create({
      user_id: req.session.user.id,
      titre: 'Archive créée',
      message: `L'archive "${titre}" (${reference}) a été créée avec succès.`,
      type: 'succes',
      lien: `/archives/${archive.id}`
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${req.session.user.id}`).emit('notification', {
        message: `Archive "${titre}" (${reference}) créée avec succès.`,
        type: 'success'
      });
    }

    req.flash('success', `Archive "${titre}" créée avec succès.`);
    res.redirect(`/archives/${archive.id}`);
  } catch (err) {
    console.error('Erreur création archive:', err);
    req.flash('error', `Erreur: ${err.message}`);
    res.redirect('/archives/creer');
  }
});

// ============================================================
// SUPPRESSION D'UN FICHIER INDIVIDUEL
// ============================================================
router.delete('/fichiers/:fichierId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const fichier = await Fichier.findByPk(req.params.fichierId);
    if (!fichier) {
      req.flash('error', 'Fichier introuvable.');
      return res.redirect('back');
    }

    const filePath = path.join(__dirname, '../../public/uploads', fichier.nom_stockage);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    const archiveId = fichier.archive_id;
    const nomOriginal = fichier.nom_original;
    await fichier.destroy();

    await logAction(req.session.user.id, 'suppression', 'fichiers', archiveId, { nom: nomOriginal }, req);

    req.flash('success', `Fichier "${nomOriginal}" supprimé.`);
    res.redirect(`/archives/${archiveId}`);
  } catch (err) {
    req.flash('error', 'Erreur lors de la suppression du fichier.');
    res.redirect('/archives');
  }
});

// ============================================================
// TÉLÉCHARGEMENT JOURNALISÉ D'UN FICHIER
// ============================================================
router.get('/fichiers/:fichierId/telecharger', requireAuth, async (req, res) => {
  try {
    const fichier = await Fichier.findByPk(req.params.fichierId);
    if (!fichier) return res.status(404).send('Fichier introuvable');

    const filePath = path.join(__dirname, '../../public/uploads', fichier.nom_stockage);
    if (!fs.existsSync(filePath)) return res.status(404).send('Fichier introuvable sur le serveur');

    await logAction(req.session.user.id, 'telechargement', 'fichiers', fichier.archive_id, { nom: fichier.nom_original }, req);
    res.download(filePath, fichier.nom_original);
  } catch (err) {
    res.status(500).send('Erreur lors du téléchargement');
  }
});

// ============================================================
// DÉTAIL ARCHIVE
// ============================================================
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const archive = await Archive.findOne({
      where: { id: req.params.id, statut: { [Op.ne]: 'supprime' } },
      include: [
        { model: Categorie, as: 'categorie' },
        { model: Service, as: 'service' },
        { model: User, as: 'createur', attributes: ['nom', 'prenom', 'email'] }
      ]
    });

    if (!archive) {
      req.flash('error', 'Archive introuvable.');
      return res.redirect('/archives');
    }

    if (archive.confidentialite === 'secret' && req.session.user.role === 'consultation') {
      req.flash('error', 'Accès refusé. Ce document est classé secret.');
      return res.redirect('/archives');
    }

    const fichiers = await Fichier.findAll({ where: { archive_id: archive.id } });
    const historique = await Historique.findAll({
      where: { entite_id: archive.id },
      include: [{ model: User, as: 'utilisateur', attributes: ['nom', 'prenom'] }],
      order: [['created_at', 'DESC']],
      limit: 20
    });

    await logAction(req.session.user.id, 'consultation', 'archives', archive.id, { reference: archive.reference }, req);

    res.render('archives/detail', {
      title: `${archive.titre} - COG Archive`,
      archive,
      fichiers,
      historique,
      moment,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error('Erreur détail:', err);
    req.flash('error', 'Erreur serveur.');
    res.redirect('/archives');
  }
});

// ============================================================
// FORMULAIRE MODIFICATION
// ============================================================
router.get('/:id/modifier', requireAuth, requireAdmin, async (req, res) => {
  try {
    const archive = await Archive.findByPk(req.params.id);
    if (!archive) { req.flash('error', 'Archive introuvable.'); return res.redirect('/archives'); }

    const { categories, services } = await getDonneesCommunes();
    res.render('archives/form', {
      title: `Modifier - ${archive.titre} - COG Archive`,
      archive,
      categories, services,
      action: `/archives/${archive.id}?_method=PUT`, method: 'POST',
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    req.flash('error', 'Erreur serveur.');
    res.redirect('/archives');
  }
});

// ============================================================
// MISE À JOUR
// ============================================================
router.put('/:id', requireAuth, requireAdmin, upload.array('fichiers', 10), async (req, res) => {
  const { titre, description, categorie_id, service_id, type_document,
          confidentialite, date_document, date_reception, expediteur, destinataire, tags } = req.body;

  try {
    const archive = await Archive.findByPk(req.params.id);
    if (!archive) {
      req.flash('error', 'Archive introuvable.');
      return res.redirect('/archives');
    }

    await archive.update({
      titre: titre?.trim(),
      description: description?.trim(),
      categorie_id: categorie_id || null,
      service_id: service_id || null,
      type_document, confidentialite,
      date_document: date_document || null,
      date_reception: date_reception || null,
      expediteur: expediteur?.trim(),
      destinataire: destinataire?.trim(),
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      updated_by: req.session.user.id
    });

    if (req.files && req.files.length > 0) {
      const fichierInserts = req.files.map(f => ({
        archive_id: archive.id,
        nom_original: f.originalname,
        nom_stockage: f.filename,
        chemin: `/uploads/${f.filename}`,
        type_mime: f.mimetype,
        taille: f.size
      }));
      await Fichier.bulkCreate(fichierInserts);
    }

    await logAction(req.session.user.id, 'modification', 'archives', archive.id, { titre }, req);

    const io = req.app.get('io');
    if (io) {
      io.to(`user-${req.session.user.id}`).emit('notification', {
        message: `Archive "${titre}" modifiée avec succès.`,
        type: 'info'
      });
    }

    req.flash('success', 'Archive modifiée avec succès.');
    res.redirect(`/archives/${archive.id}`);
  } catch (err) {
    console.error('Erreur modification:', err);
    req.flash('error', `Erreur: ${err.message}`);
    res.redirect(`/archives/${req.params.id}/modifier`);
  }
});

// ============================================================
// CORBEILLE (soft delete)
// ============================================================
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Archive.update(
      { statut: 'corbeille', deleted_at: new Date() },
      { where: { id: req.params.id } }
    );
    await logAction(req.session.user.id, 'suppression', 'archives', req.params.id, {}, req);
    req.flash('success', 'Archive déplacée à la corbeille.');
  } catch (err) {
    req.flash('error', 'Erreur lors de la suppression.');
  }
  res.redirect('/archives');
});

// ============================================================
// CORBEILLE - liste
// ============================================================
router.get('/corbeille/liste', requireAuth, requireAdmin, async (req, res) => {
  try {
    const archives = await Archive.findAll({
      where: { statut: 'corbeille' },
      include: [
        { model: Categorie, as: 'categorie', attributes: ['nom'] },
        { model: Service, as: 'service', attributes: ['nom'] }
      ],
      order: [['deleted_at', 'DESC']]
    });

    res.render('archives/corbeille', {
      title: 'Corbeille - COG Archive',
      archives,
      moment,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    req.flash('error', 'Erreur serveur.');
    res.redirect('/archives');
  }
});

// Restaurer depuis corbeille
router.post('/:id/restaurer', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Archive.update(
      { statut: 'actif', deleted_at: null },
      { where: { id: req.params.id } }
    );
    await logAction(req.session.user.id, 'restauration', 'archives', req.params.id, {}, req);
    req.flash('success', 'Archive restaurée avec succès.');
  } catch (err) {
    req.flash('error', 'Erreur lors de la restauration.');
  }
  res.redirect('/archives/corbeille/liste');
});

// Suppression définitive
router.delete('/:id/supprimer-definitif', requireAuth, requireAdmin, async (req, res) => {
  try {
    const fichiers = await Fichier.findAll({ where: { archive_id: req.params.id } });
    fichiers.forEach(f => {
      const filePath = path.join(__dirname, '../../public/uploads', f.nom_stockage);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    await Fichier.destroy({ where: { archive_id: req.params.id } });
    await Archive.update({ statut: 'supprime' }, { where: { id: req.params.id } });
    await logAction(req.session.user.id, 'suppression', 'archives', req.params.id, { definitif: true }, req);
    req.flash('success', 'Archive supprimée définitivement.');
  } catch (err) {
    req.flash('error', 'Erreur lors de la suppression définitive.');
  }
  res.redirect('/archives/corbeille/liste');
});

// ============================================================
// EXPORT PDF (fiche individuelle)
// ============================================================
router.get('/:id/export-pdf', requireAuth, async (req, res) => {
  const PDFDocument = require('pdfkit');
  try {
    const archive = await Archive.findByPk(req.params.id, {
      include: [
        { model: Categorie, as: 'categorie', attributes: ['nom'] },
        { model: Service, as: 'service', attributes: ['nom'] }
      ]
    });

    if (!archive) return res.status(404).send('Archive introuvable');

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="archive-${archive.reference}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).fillColor('#0057A8').text('COMITÉ OLYMPIQUE GABONAIS', { align: 'center' });
    doc.fontSize(14).fillColor('#333').text('FICHE D\'ARCHIVE NUMÉRIQUE', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#009A44').lineWidth(2).stroke();
    doc.moveDown();

    const champs = [
      ['Référence', archive.reference],
      ['Titre', archive.titre],
      ['Description', archive.description || '-'],
      ['Catégorie', archive.categorie?.nom || '-'],
      ['Service', archive.service?.nom || '-'],
      ['Type de document', archive.type_document],
      ['Confidentialité', archive.confidentialite],
      ['Statut', archive.statut],
      ['Date du document', archive.date_document ? moment(archive.date_document).format('DD/MM/YYYY') : '-'],
      ['Expéditeur', archive.expediteur || '-'],
      ['Destinataire', archive.destinataire || '-'],
      ['Date de création', moment(archive.created_at).format('DD/MM/YYYY HH:mm')]
    ];

    champs.forEach(([label, valeur]) => {
      doc.fontSize(10).fillColor('#0057A8').text(`${label}: `, { continued: true });
      doc.fillColor('#333').text(valeur || '-');
    });

    if (archive.qr_code) {
      doc.moveDown();
      doc.text('QR Code:', { align: 'center' });
      const base64Data = archive.qr_code.split(',')[1];
      doc.image(Buffer.from(base64Data, 'base64'), { width: 100, align: 'center' });
    }

    doc.end();
    await logAction(req.session.user.id, 'export', 'archives', archive.id, { format: 'pdf' }, req);
  } catch (err) {
    res.status(500).send('Erreur export PDF');
  }
});

// ============================================================
// RECHERCHE AVANCÉE
// ============================================================
router.get('/recherche/avancee', requireAuth, async (req, res) => {
  const { categories, services } = await getDonneesCommunes();
  res.render('archives/recherche', {
    title: 'Recherche avancée - COG Archive',
    categories, services,
    resultats: null,
    filters: req.query,
    moment,
    error: req.flash('error'),
    success: req.flash('success')
  });
});

router.post('/recherche/avancee', requireAuth, async (req, res) => {
  const { search, categorie_id, service_id, type_document, confidentialite, statut, date_debut, date_fin, expediteur } = req.body;
  const { categories, services } = await getDonneesCommunes();

  try {
    const where = {
      statut: { [Op.notIn]: ['corbeille', 'supprime'] }
    };

    if (search) {
      where[Op.or] = [
        { titre: { [Op.like]: `%${search}%` } },
        { reference: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (categorie_id) where.categorie_id = categorie_id;
    if (service_id) where.service_id = service_id;
    if (type_document) where.type_document = type_document;
    if (confidentialite) where.confidentialite = confidentialite;
    if (statut) where.statut = statut;
    if (date_debut || date_fin) {
      where.date_document = {};
      if (date_debut) where.date_document[Op.gte] = date_debut;
      if (date_fin) where.date_document[Op.lte] = date_fin;
    }
    if (expediteur) where.expediteur = { [Op.like]: `%${expediteur}%` };

    appliquerRestrictionConfidentialite(where, req.session.user.role);

    const resultats = await Archive.findAll({
      where,
      include: [
        { model: Categorie, as: 'categorie', attributes: ['nom', 'couleur'] },
        { model: Service, as: 'service', attributes: ['nom'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 100
    });

    res.render('archives/recherche', {
      title: 'Résultats de recherche - COG Archive',
      categories, services,
      resultats,
      filters: req.body,
      moment,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Erreur lors de la recherche.');
    res.redirect('/archives/recherche/avancee');
  }
});

// ============================================================
// EXPORT PDF (liste globale)
// ============================================================
router.get('/export/pdf', requireAuth, requireAdmin, async (req, res) => {
  const PDFDocument = require('pdfkit');
  try {
    const archives = await Archive.findAll({
      where: { statut: { [Op.ne]: 'supprime' } },
      include: [
        { model: Categorie, as: 'categorie', attributes: ['nom'] },
        { model: Service, as: 'service', attributes: ['nom'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="liste-archives-cog.pdf"');
    doc.pipe(res);

    doc.fontSize(18).fillColor('#0057A8').text('COMITÉ OLYMPIQUE GABONAIS', { align: 'center' });
    doc.fontSize(12).fillColor('#333').text('LISTE DES ARCHIVES NUMÉRIQUES', { align: 'center' });
    doc.fontSize(9).fillColor('#888').text(`Généré le ${moment().format('DD/MM/YYYY à HH:mm')} · ${archives.length} archive(s)`, { align: 'center' });
    doc.moveDown();
    doc.moveTo(40, doc.y).lineTo(800, doc.y).strokeColor('#009A44').lineWidth(1.5).stroke();
    doc.moveDown(0.5);

    const colX = [40, 150, 360, 480, 590, 680];
    const headers = ['Référence', 'Titre', 'Catégorie', 'Service', 'Type', 'Date'];
    doc.rect(40, doc.y, 760, 18).fill('#0057A8');
    let headerY = doc.y - 18;
    headers.forEach((h, i) => doc.fontSize(9).fillColor('#fff').text(h, colX[i], headerY + 5, { width: 110 }));
    doc.moveDown(1.2);

    archives.forEach((a, idx) => {
      if (doc.y > 520) { doc.addPage(); doc.y = 40; }
      const rowY = doc.y;
      if (idx % 2 === 0) doc.rect(40, rowY - 2, 760, 16).fill('#F8F9FA');
      doc.fontSize(8).fillColor('#212529');
      doc.text(a.reference, colX[0], rowY, { width: 105 });
      doc.text((a.titre || '').substring(0, 45), colX[1], rowY, { width: 200 });
      doc.text(a.categorie?.nom || '-', colX[2], rowY, { width: 110 });
      doc.text(a.service?.nom || '-', colX[3], rowY, { width: 100 });
      doc.text(a.type_document, colX[4], rowY, { width: 80 });
      doc.text(a.date_document ? moment(a.date_document).format('DD/MM/YYYY') : '-', colX[5], rowY, { width: 90 });
      doc.moveDown(0.9);
    });

    doc.end();
    await logAction(req.session.user.id, 'export', 'archives', null, { format: 'pdf-liste' }, req);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur export PDF');
  }
});

// ============================================================
// EXPORT EXCEL
// ============================================================
router.get('/export/excel', requireAuth, requireAdmin, async (req, res) => {
  const ExcelJS = require('exceljs');
  try {
    const archives = await Archive.findAll({
      where: { statut: { [Op.ne]: 'supprime' } },
      include: [
        { model: Categorie, as: 'categorie', attributes: ['nom'] },
        { model: Service, as: 'service', attributes: ['nom'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Archives COG');

    ws.columns = [
      { header: 'Référence', key: 'reference', width: 20 },
      { header: 'Titre', key: 'titre', width: 40 },
      { header: 'Catégorie', key: 'categorie', width: 20 },
      { header: 'Service', key: 'service', width: 25 },
      { header: 'Type', key: 'type_document', width: 15 },
      { header: 'Confidentialité', key: 'confidentialite', width: 15 },
      { header: 'Statut', key: 'statut', width: 12 },
      { header: 'Date document', key: 'date_document', width: 15 },
      { header: 'Expéditeur', key: 'expediteur', width: 30 },
      { header: 'Date création', key: 'created_at', width: 20 }
    ];

    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0057A8' } };
    ws.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    archives.forEach(a => {
      ws.addRow({
        reference: a.reference,
        titre: a.titre,
        categorie: a.categorie?.nom || '-',
        service: a.service?.nom || '-',
        type_document: a.type_document,
        confidentialite: a.confidentialite,
        statut: a.statut,
        date_document: a.date_document ? moment(a.date_document).format('DD/MM/YYYY') : '-',
        expediteur: a.expediteur || '-',
        created_at: moment(a.created_at).format('DD/MM/YYYY HH:mm')
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="archives-cog.xlsx"');
    await workbook.xlsx.write(res);
    await logAction(req.session.user.id, 'export', 'archives', null, { format: 'excel' }, req);
  } catch (err) {
    res.status(500).send('Erreur export Excel');
  }
});

// ============================================================
// EXPORT CSV
// ============================================================
router.get('/export/csv', requireAuth, requireAdmin, async (req, res) => {
  try {
    const archives = await Archive.findAll({
      where: { statut: { [Op.ne]: 'supprime' } },
      include: [
        { model: Categorie, as: 'categorie', attributes: ['nom'] },
        { model: Service, as: 'service', attributes: ['nom'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const rows = [['Référence', 'Titre', 'Catégorie', 'Service', 'Type', 'Confidentialité', 'Statut', 'Date document', 'Date création']];
    archives.forEach(a => {
      rows.push([
        a.reference, a.titre, a.categorie?.nom || '', a.service?.nom || '',
        a.type_document, a.confidentialite, a.statut,
        a.date_document || '', moment(a.created_at).format('DD/MM/YYYY HH:mm')
      ]);
    });

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="archives-cog.csv"');
    res.send('\uFEFF' + csv);
    await logAction(req.session.user.id, 'export', 'archives', null, { format: 'csv' }, req);
  } catch (err) {
    res.status(500).send('Erreur export CSV');
  }
});

module.exports = router;
