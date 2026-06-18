const sequelize = require('../config/database');
const User = require('./User');
const Categorie = require('./Categorie');
const Service = require('./Service');
const Archive = require('./Archive');
const Fichier = require('./Fichier');
const Historique = require('./Historique');
const Notification = require('./Notification');

// ============================================================
// ASSOCIATIONS
// ============================================================

// Archive belongsTo Categorie / Service
Archive.belongsTo(Categorie, { foreignKey: 'categorie_id', as: 'categorie' });
Categorie.hasMany(Archive, { foreignKey: 'categorie_id', as: 'archives' });

Archive.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
Service.hasMany(Archive, { foreignKey: 'service_id', as: 'archives' });

// Archive belongsTo User (créateur / dernier modificateur)
Archive.belongsTo(User, { foreignKey: 'created_by', as: 'createur' });
Archive.belongsTo(User, { foreignKey: 'updated_by', as: 'modificateur' });
User.hasMany(Archive, { foreignKey: 'created_by', as: 'archivesCreees' });

// Archive hasMany Fichier
Archive.hasMany(Fichier, { foreignKey: 'archive_id', as: 'fichiers', onDelete: 'CASCADE' });
Fichier.belongsTo(Archive, { foreignKey: 'archive_id', as: 'archive' });

// Historique belongsTo User
Historique.belongsTo(User, { foreignKey: 'user_id', as: 'utilisateur' });
User.hasMany(Historique, { foreignKey: 'user_id', as: 'historique' });

// Notification belongsTo User
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'utilisateur' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

module.exports = {
  sequelize,
  User,
  Categorie,
  Service,
  Archive,
  Fichier,
  Historique,
  Notification
};
