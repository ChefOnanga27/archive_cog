const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');

class Archive extends Model {}

Archive.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  reference: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  titre: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  categorie_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  service_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  type_document: {
    type: DataTypes.ENUM('entrant', 'sortant', 'interne'),
    defaultValue: 'interne'
  },
  confidentialite: {
    type: DataTypes.ENUM('public', 'normal', 'confidentiel', 'secret'),
    defaultValue: 'normal'
  },
  statut: {
    type: DataTypes.ENUM('actif', 'archive', 'supprime', 'corbeille'),
    defaultValue: 'actif'
  },
  date_document: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  date_reception: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  expediteur: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  destinataire: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  tags: {
    type: DataTypes.STRING(1000), // stocké en CSV, voir getters/setters
    allowNull: true,
    get() {
      const raw = this.getDataValue('tags');
      return raw ? raw.split(',').map(t => t.trim()).filter(Boolean) : [];
    },
    set(value) {
      if (Array.isArray(value)) {
        this.setDataValue('tags', value.join(','));
      } else {
        this.setDataValue('tags', value);
      }
    }
  },
  qr_code: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Archive',
  tableName: 'archives',
  indexes: [
    { fields: ['reference'] },
    { fields: ['titre'] },
    { fields: ['statut'] },
    { fields: ['created_at'] },
    { fields: ['categorie_id'] },
    { fields: ['service_id'] }
  ]
});

module.exports = Archive;
