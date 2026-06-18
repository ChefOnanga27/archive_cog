const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Service extends Model {}

Service.init({
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
  responsable: {
    type: DataTypes.STRING(200),
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Service',
  tableName: 'services',
  updatedAt: false
});

module.exports = Service;
