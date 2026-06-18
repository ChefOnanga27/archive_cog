const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Historique extends Model {}

Historique.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  action: {
    type: DataTypes.ENUM(
      'connexion', 'deconnexion', 'ajout', 'modification',
      'suppression', 'restauration', 'telechargement', 'consultation', 'export'
    ),
    allowNull: false
  },
  entite: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  entite_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Historique',
  tableName: 'historique',
  updatedAt: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['created_at'] },
    { fields: ['entite_id'] }
  ]
});

module.exports = Historique;
