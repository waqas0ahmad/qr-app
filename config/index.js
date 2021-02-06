const moment = require('moment');
const _ = require('lodash');

function utcDefault() {
    let date = new Date()
    return date = moment.utc(date).format();
}
module.exports = {
    'host': 'mongodb',
    'database': 'mongodb://localhost:27017/QR-DB',
    'secret': 'QR@123$',
    'https_port': 8787, //8888
    'http_port': 8787, // 8787
    'successCode': 200,
    'errCode': 403,
    'errMessage': 'Something went wrong!',
    'utcDefault': utcDefault,
};