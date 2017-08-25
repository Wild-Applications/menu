var mongoose = require('mongoose');

var schema = new mongoose.Schema({
  name : { type : String, required : true },
  description: { type: String, required: false },
  active: { type: Boolean, required: true, default: false },
  contents: [{  title:{type:String, required: true},
                products: [{type: mongoose.Schema.ObjectId, ref: 'Product'}],
                _id: false} ],
  owner: { type : Number, required : true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Menu', schema);
