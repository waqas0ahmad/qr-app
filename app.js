var express = require('express');
var mongoose = require('mongoose');
var ip = require('ip');
var fs = require('fs');
var bodyParser = require('body-parser');
var app = express();
var config = require('./config');

mongoose.Promise = global.Promise;
module.exports = mongoose;
var uri = 'mongodb+srv://mongo-user:rOvSfEVPWzaSEXUI@cluster0.rbmyn.mongodb.net/qr-db-in?retryWrites=true&w=majority&keepAlive=true&poolSize=30&autoReconnect=true&socketTimeoutMS=360000&connectTimeoutMS=360000';
mongoose.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true });
// mongoose.connect('mongodb+srv://admin:fdm2pT88lKbc7Efr@cluster0.vlzpg.mongodb.net/QR-DB?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true, server: {
//     socketOptions: {
//       socketTimeoutMS: 0,
//       connectTimeoutMS: 0
//     }
//   } }, function (err, data) {
//     if (err) {
//         throw err;
//         //console.log('Sorry can not connect with mongodb...');
//     } else if (data) {
//         console.log('Successfully QR-code-server connected mongodb...');
//         return;
//     }
// });
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
// HTTPS
const host = ip.address();
var https = require('https');
var http = require('http');
if (host == 'Your_production_IP_address') {
    var options = {
        key: fs.readFileSync('Your_qrsslcert.key_Path', 'utf8'),
        cert: fs.readFileSync('Your_qrsslcert.crt_Path', 'utf8'),
        requestCert: false,
        rejectUnauthorized: false
    };
    https.createServer(app, options);
    app.listen(config.https_port, host, function () {
        console.log(`Node QR server running on ${host}:`, config.https_port);
    });
} else {
    http.createServer(app);
    config.http_port=5232;
    app.listen(config.http_port, function () {
        console.log("Node QR server running on ", config.http_port);
    });
}

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(bodyParser.json({
    limit: '50mb'
}));
app.use(bodyParser.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000
}));

var enableCORS = function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', '*');
    res.header('Access-Control-Allow-Headers', '*');
    if ('OPTIONS' === req.method) {
        res.sendStatus(200);
    } else {
        next();
    }
};
app.use(enableCORS);

var models_path = __dirname + '/model';
fs.readdirSync(models_path).forEach(function (file) {
    if (~file.indexOf('.js')) require(models_path + '/' + file);
});


// Routes
require('./routes')(app);

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    console.log(err.stack);
});

app.use(express.static(__dirname + '/images'));
