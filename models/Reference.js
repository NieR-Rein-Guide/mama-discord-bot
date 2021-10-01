const { Model, DataTypes } = require('sequelize')
const sequelize = require('./index')

class Reference extends Model {}

Reference.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  alias: {
    type: DataTypes.TEXT,
    unique: true,
  },
  type: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },
  slug: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },
  item_id: {
    type: DataTypes.TEXT,
    defaultValue: null,
  },
  use_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  }
}, {
  sequelize,
  modelName: 'references'
})

module.exports = Reference