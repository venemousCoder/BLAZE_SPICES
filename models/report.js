const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema({
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reportedItem: { 
        type: Schema.Types.ObjectId, 
        required: true,
        refPath: 'itemType'
    },
    itemType: { 
        type: String, 
        required: true, 
        enum: ['Recipe', 'User', 'Group', 'Comment'] 
    },
    type: { 
        type: String, 
        enum: ['spam', 'inappropriate', 'copyright'], 
        required: true 
    },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'dismissed', 'resolved'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', reportSchema);