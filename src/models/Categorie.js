const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Categorie extends Model {}

Categorie.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nom: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  couleur: {
    type: DataTypes.STRING(7),
    defaultValue: '#0057A8'
  },
  icone: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Categorie',
  tableName: 'categories',
  updatedAt: false
});

module.exports = Categorie;
