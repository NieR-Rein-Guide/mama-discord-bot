const { Model, DataTypes } = require('sequelize')
const sequelize = require('./index')

class Reference extends Model {}

Reference.init({
  id: {
    type: DataTypes.INTEGER,
    unique: true,
    primaryKey: true,
    autoIncrement: true
  },
  alias: {
    type: DataTypes.TEXT,
    unique: true,
  },
  type: {
    type: DataTypes.TEXT,
  },
  slug: {
    type: DataTypes.TEXT,
  },
}, {
  sequelize,
  modelName: 'references'
})

module.exports = Reference