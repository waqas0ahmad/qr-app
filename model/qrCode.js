var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const config = require('../config');

var qrCodeSchema = mongoose.Schema({
    userID: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'user'
    },
    qrName: {
        type: String
    },
    qrCodeContent: {
        type: Schema.Types.Mixed,
        default: ''
    },
    qrCodeType: {
        type: String,
        default: 'text'
    },
    qrConfigData: {
        type: Schema.Types.Mixed
    },
    stats: {
        type: Schema.Types.Mixed
    },
    created_At: {
        type: Date,
        default: config.utcDefault()
    },
    updated_date: {
        type: Date
    }
});


module.exports = mongoose.model('qrCode', qrCodeSchema, 'qrCode');