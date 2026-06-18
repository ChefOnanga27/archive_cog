/**
 * Script d'initialisation de la base de données
 * Usage: node src/seeders/seed.js
 */
const bcrypt = require('bcryptjs');
const { sequelize, User, Categorie, Service } = require('../models');

const seed = async () => {
  try {
    console.log('🔄 Synchronisation des modèles avec la base de données...');
    await sequelize.sync({ alter: false });
    console.log('✅ Tables créées/vérifiées.');

    // ============================================================
    // CATÉGORIES
    // ============================================================
    const categoriesData = [
      { nom: 'Administration', description: 'Documents administratifs généraux', couleur: '#0057A8', icone: 'folder' },
      { nom: 'Finances', description: 'Documents financiers et comptables', couleur: '#009A44', icone: 'dollar-sign' },
      { nom: 'Juridique', description: 'Documents juridiques et légaux', couleur: '#F4C300', icone: 'scale' },
      { nom: 'Sports', description: 'Documents liés aux activités sportives', couleur: '#CE1126', icone: 'activity' },
      { nom: 'Communication', description: 'Documents de communication et presse', couleur: '#0057A8', icone: 'megaphone' },
      { nom: 'Ressources Humaines', description: 'Documents RH et personnel', couleur: '#009A44', icone: 'users' },
      { nom: 'Événements', description: 'Documents relatifs aux événements', couleur: '#F4C300', icone: 'calendar' },
      { nom: 'Partenariats', description: 'Documents de partenariats et sponsors', couleur: '#0057A8', icone: 'handshake' }
    ];

    for (const cat of categoriesData) {
      const existing = await Categorie.findOne({ where: { nom: cat.nom } });
      if (!existing) await Categorie.create(cat);
    }
    console.log(`✅ ${categoriesData.length} catégories vérifiées.`);

    // ============================================================
    // SERVICES
    // ============================================================
    const servicesData = [
      { nom: 'Direction Générale', description: 'Direction générale du COG' },
      { nom: 'Secrétariat Général', description: 'Secrétariat général' },
      { nom: 'Direction Financière', description: 'Direction administrative et financière' },
      { nom: 'Direction Technique', description: 'Direction technique et sportive' },
      { nom: 'Communication', description: 'Service de communication et relations publiques' },
      { nom: 'Ressources Humaines', description: 'Service des ressources humaines' },
      { nom: 'Juridique', description: 'Service juridique et contentieux' },
      { nom: 'Événements', description: 'Service organisation des événements' }
    ];

    for (const srv of servicesData) {
      const existing = await Service.findOne({ where: { nom: srv.nom } });
      if (!existing) await Service.create(srv);
    }
    console.log(`✅ ${servicesData.length} services vérifiés.`);

    // ============================================================
    // SUPER ADMIN PAR DÉFAUT
    // ============================================================
    const adminEmail = 'admin@cog-gabon.ga';
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('Admin2024!', 10);
      await User.create({
        nom: 'COG',
        prenom: 'Admin',
        email: adminEmail,
        password_hash: passwordHash,
        role: 'super_admin',
        service: 'Direction Générale'
      });
      console.log('✅ Super administrateur créé.');
      console.log('   Email: admin@cog-gabon.ga');
      console.log('   Mot de passe: Admin2024!');
    } else {
      console.log('ℹ️  Super administrateur déjà existant.');
    }

    console.log('\n🎉 Initialisation de la base de données terminée avec succès !\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur lors de l\'initialisation:', err);
    process.exit(1);
  }
};

seed();
