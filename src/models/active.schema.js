var mongoose = require('mongoose');

var schema = new mongoose.Schema({
  menu: [{type: mongoose.Schema.ObjectId, ref: 'Menu'}],
  owner: { type : Number, required : true, index: true, unique: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Active', schema);
