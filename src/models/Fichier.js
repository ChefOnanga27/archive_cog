const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Fichier extends Model {}

Fichier.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  archive_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  nom_original: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  nom_stockage: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  chemin: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  type_mime: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  taille: {
    type: DataTypes.BIGINT,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Fichier',
  tableName: 'fichiers',
  updatedAt: false
});

module.exports = Fichier;
