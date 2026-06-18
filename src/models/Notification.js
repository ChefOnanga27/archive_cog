const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Notification extends Model {}

Notification.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  titre: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('info', 'succes', 'avertissement', 'erreur'),
    defaultValue: 'info'
  },
  lue: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lien: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Notification',
  tableName: 'notifications',
  updatedAt: false,
  indexes: [{ fields: ['user_id'] }]
});

module.exports = Notification;
