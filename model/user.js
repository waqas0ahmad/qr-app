var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
const config = require('../config');

var UserSchema = mongoose.Schema({
    userName: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    firstName: {
        type: String
    },
    lastName: {
        type: String
    },
    userSubcriptionType: {
        type: String
    },
    created_At: {
        type: Date,
        default: config.utcDefault()
    },
    updated_At: {
        type: Date
    }
});

UserSchema.methods.generateHash = function (password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
UserSchema.methods.validPassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('user', UserSchema, 'user');
