// ********************************************************** qrCode controller ********************************************* //

const mongoose = require('mongoose');
const config = require('../config');
const async = require('async');
const _ = require('lodash');
const chalk = require('chalk');
const jwt = require('jsonwebtoken');
const CryptoTS = require("crypto-ts");
const userSchema = mongoose.model('user');
const qrSchema = mongoose.model('qrCode');
const fs = require('fs');

// ********************************************************* User Auth API **************************************************** //

exports.register = (req, res) => {
    var receivedValues = req.body;
    if (JSON.stringify(receivedValues) === '{}' || receivedValues === undefined || receivedValues === null) {
        res.json({
            "code": config.errCode,
            "status": "Error",
            "message": "Invalid Data Enter"
        });
        return;
    } else {
        userSchema.findOne({
            userName: req.body.userName
        })
            .select({ _id: 1 })
            .exec((err, user) => {
                if (err) {
                    res.json({
                        "code": config.errCode,
                        "status": "Error",
                        "message": err.message
                    });
                    return;
                }
                if (!user) {
                    var userdata = new userSchema();
                    userdata.firstName = _.capitalize(receivedValues.firstName);
                    userdata.lastName = _.capitalize(receivedValues.lastName);
                    userdata.email = receivedValues.email;
                    userdata.userName = receivedValues.userName;
                    userdata.password = userdata.generateHash(receivedValues.password);
                    userdata.save((err, data) => {
                        if (!err) {
                            var authToken = jwt.sign(data.toJSON(), config.secret, {
                                expiresIn: '24h'
                            });
                            // const emailSubject = 'Registration';
                            // const emailBody = 'Your Registration successfully.';
                            // const senderName = 'Elsner Technology Ptv. Ltd.';
                            // config.emailSender(receivedValues.email, emailSubject, emailBody, senderName);
                            res.json({
                                "code": config.successCode,
                                "authToken": authToken,
                                "data": data,
                                "status": "success"
                            });
                        } else {
                            res.json({
                                "code": config.errCode,
                                "status": "Error",
                                "message": err.message
                            });
                        }
                    });
                } else {
                    res.json({
                        "code": config.errCode,
                        "status": "Error",
                        "message": "Username already exists"
                    });
                }
            });
    }
};

exports.login = (req, res) => {
    var receivedValues = req.body;
    if (
        JSON.stringify(receivedValues) === '{}' ||
        receivedValues === undefined ||
        receivedValues === null ||
        receivedValues.userName === '' ||
        receivedValues.password === ''
    ) {
        res.json({
            "code": config.errCode,
            "status": "Error",
            "message": "All fields are required"
        });
        return;
    } else {
        const bytes = CryptoTS.AES.decrypt(req.body.password.toString(), config.secret);
        const plaintext = bytes.toString(CryptoTS.enc.Utf8);
        userSchema.findOne({
            userName: receivedValues.userName,
        }, (err, userDetail) => {
            if (userDetail !== null) {
                if (userDetail.validPassword(plaintext)) {
                    var authToken = jwt.sign(userDetail.toJSON(), config.secret, {
                        expiresIn: '24h'
                    });
                    res.json({
                        "code": config.successCode,
                        "authToken": authToken,
                        "data": userDetail,
                        "status": "success"
                    });
                } else {
                    res.json({
                        "code": config.errCode,
                        "status": "Error",
                        "message": "Your password is wrong."
                    });
                }
            } else {
                res.json({
                    "code": config.errCode,
                    "status": "Error",
                    "message": "Your username is wrong."
                });
            }
        });
    }
};

// ********************************************************* Dynamic QR code API *********************************************** //

exports.createEditDynamicURL = (req, res) => {
    const receivedValues = req.body;
    if (JSON.stringify(receivedValues) === '{}') {
        res.json({
            "code": config.errCode,
            "status": "Error",
            "message": "Invalid data enter"
        });
    } else {
        qrSchema.findOne({
            userID: req.user._id,
            _id: req.body._id
        })
            .select({ _id: 1 })
            .exec((err, qrCodeInfo) => {
                if (err) {
                    console.log(err);
                    res.json({
                        "code": config.errCode,
                        "status": "Error",
                        "message": config.errMessage,
                    });
                    return;
                }
                if (!qrCodeInfo) {
                    let qrData;
                    qrData = {
                        userID: req.user._id,
                        qrName: !receivedValues.qrName || receivedValues.qrName == '' ? 'My QR' : receivedValues.qrName,
                        qrCodeContent: !receivedValues.qrCodeContent ? '' : receivedValues.qrCodeContent,
                        qrCodeType: !receivedValues.qrCodeType ? '' : receivedValues.qrCodeType,
                        created_date: config.utcDefault()
                    };
                    qrSchema.create(qrData, (err, result) => {
                        if (!err) {
                            res.json({
                                "code": config.successCode,
                                "status": "Smart QR code created successfully",
                                data: result
                            });
                        } else {
                            res.json({
                                "code": config.errCode,
                                "status": "err",
                                "message": "QR is not created",
                            });
                        }
                    });
                } else {
                    let fieldToSet;
                    fieldToSet = {
                        qrName: !receivedValues.qrName || receivedValues.qrName == '' ? 'My QR' : receivedValues.qrName,
                        qrCodeContent: !receivedValues.qrCodeContent ? '' : receivedValues.qrCodeContent,
                        qrCodeType: !receivedValues.qrCodeType ? '' : receivedValues.qrCodeType,
                        qrConfigData: !receivedValues.qrConfigData ? undefined : receivedValues.qrConfigData,
                        updated_date: config.utcDefault()
                    };
                    let Option = {
                        new: true
                    };
                    qrSchema.findByIdAndUpdate(qrCodeInfo._id, fieldToSet, Option, (err, updatedData) => {
                        if (err) {
                            console.log(err);
                            res.json({
                                "code": config.errCode,
                                "status": "Error",
                                "message": config.errMessage,
                            });
                            return;
                        } else {
                            res.json({
                                "code": config.successCode,
                                "status": "Success",
                                "message": "QR code updated successfully",
                                "data": updatedData
                            });
                        }
                    });
                }
            });
    }
}

exports.getUserQRCodes = (req, res) => {
    const offset = req.body.pageOffset * req.body.pageLimit;
    qrSchema.find({
        userID: req.user._id
    })
        .lean()
        .countDocuments()
        .then(counts => {
            return counts;
        }).then((totalQRCodes) => {
            if (!totalQRCodes || totalQRCodes === 0) {
                res.json({
                    "code": config.successCode,
                    "status": "Error",
                    "message": 'No QR code found',
                });
                return;
            } else {
                qrSchema.find({
                    userID: req.user._id
                })
                    .sort({ _id: -1 })
                    .skip(offset)
                    .limit(req.body.limit)
                    .select({ userID: 0, qrCodeContent: 0, qrConfigData: 0, __v: 0 })
                    .lean()
                    .exec((err, qrCodes) => {
                        if (err) {
                            console.log(err);
                            res.json({
                                "code": config.errCode,
                                "status": "Error",
                                "message": config.errMessage,
                            });
                            return;
                        } else {
                            res.json({
                                "code": config.successCode,
                                "status": "success",
                                "data": {
                                    qrCodes: qrCodes,
                                    totalQRCodes: totalQRCodes
                                }
                            });
                        }
                    });
            }
        })
};

exports.getQRCodeByID = (req, res) => {
    const receivedValues = req.body;
    if (JSON.stringify(receivedValues) === '{}') {
        res.json({
            "code": config.errCode,
            "status": "Error",
            "message": "Invalid data enter"
        });
    } else {
        let usercolumns = ["qrID"];
        for (let iter = 0; iter < usercolumns.length; iter++) {
            let columnName = usercolumns[iter];
            if (receivedValues[columnName] === undefined && (columnName === 'qrID')) {
                console.log(chalk.red(columnName, " field is undefined at getQRCodeByID"));
                res.json({
                    "code": config.errCode,
                    "status": "Error",
                    "message": columnName + " field is undefined"
                });
                return;
            }
        }
        qrSchema.findOne({
            userID: req.user._id,
            _id: req.body.qrID
        })
            .select({ userID: 0, stats: 0, created_At: 0, updated_date: 0, __v: 0 })
            .exec((err, qrCodeInfo) => {
                if (err) {
                    if (err.name == 'CastError' && err.kind == 'ObjectId' && err.path == '_id') {
                        res.json({
                            "code": config.errCode,
                            "status": "Error",
                            "message": "QR code not found...",
                        });
                        return;
                    } else {
                        console.log(err);
                        res.json({
                            "code": config.errCode,
                            "status": "Error",
                            "message": config.errMessage,
                        });
                        return;
                    }
                }
                if (!qrCodeInfo) {
                    res.json({
                        "code": config.errCode,
                        "status": "Error",
                        "message": "QR code not found...",
                    });
                } else {
                    res.json({
                        "code": config.successCode,
                        "status": "success",
                        "data": qrCodeInfo
                    });
                }
            });
    }
};

exports.getQRCodeAnalyticsByID = (req, res) => {
    const receivedValues = req.body;
    if (JSON.stringify(receivedValues) === '{}') {
        res.json({
            "code": config.errCode,
            "status": "Error",
            "message": "Invalid data enter"
        });
    } else {
        let usercolumns = ["qrID"];
        for (let iter = 0; iter < usercolumns.length; iter++) {
            let columnName = usercolumns[iter];
            if (receivedValues[columnName] === undefined && (columnName === 'qrID')) {
                console.log(chalk.red(columnName, " field is undefined at getQRCodeByID"));
                res.json({
                    "code": config.errCode,
                    "status": "Error",
                    "message": columnName + " field is undefined"
                });
                return;
            }
        }
        qrSchema.findOne({
            userID: req.user._id,
            _id: req.body.qrID
        })
            .select({ stats: 1 })
            .exec((err, qrCodeInfo) => {
                if (err) {
                    console.log(err);
                    res.json({
                        "code": config.errCode,
                        "status": "Error",
                        "message": config.errMessage,
                    });
                    return;
                }
                if (!qrCodeInfo) {
                    res.json({
                        "code": config.errCode,
                        "status": "Error",
                        "message": config.errMessage,
                    });
                } else {
                    if (qrCodeInfo.stats) {
                        res.json({
                            "code": config.successCode,
                            "status": "success",
                            "data": qrCodeInfo
                        });
                    } else {
                        res.json({
                            "code": config.errCode,
                            "status": "Error",
                            "message": "No analytics found for this QR code",
                        });
                    }
                }
            });
    }
};

exports.deleteQRCodeByID = (req, res) => {
    const receivedValues = req.body;
    if (JSON.stringify(receivedValues) === '{}') {
        res.json({
            "code": config.errCode,
            "status": "Error",
            "message": "Invalid data enter"
        });
    } else {
        let usercolumns = ["qrID"];
        for (let iter = 0; iter < usercolumns.length; iter++) {
            let columnName = usercolumns[iter];
            if (receivedValues[columnName] === undefined && (columnName === 'qrID')) {
                console.log(chalk.red(columnName, " field is undefined at getQRCodeByID"));
                res.json({
                    "code": config.errCode,
                    "status": "Error",
                    "message": columnName + " field is undefined"
                });
                return;
            }
        }
        qrSchema.deleteOne({
            userID: req.user._id,
            _id: req.body.qrID
        }).exec((err, qrCodeInfo) => {
            if (err) {
                console.log(err);
                res.json({
                    "code": config.errCode,
                    "status": "Error",
                    "message": config.errMessage,
                });
                return;
            }
            if (qrCodeInfo.deletedCount === 1) {
                res.json({
                    "code": config.successCode,
                    "status": "success",
                    "message": 'QR code deleted sucessfully'
                });
            } else {
                res.json({
                    "code": config.errCode,
                    "status": "Error",
                    "message": config.errMessage,
                });
            }
        });
    }
};

// ********************************************************** Dynamic Redirect URL ******************************************** //

exports.redirectURL = (req, res) => {
    const receivedValues = req.body;
    if (JSON.stringify(receivedValues) === '{}') {
        res.json({
            "code": config.errCode,
            "status": "Error",
            "message": "Invalid data enter"
        });
    } else {
        let usercolumns = ["qrID"];
        for (let iter = 0; iter < usercolumns.length; iter++) {
            let columnName = usercolumns[iter];
            if (receivedValues[columnName] === undefined && (columnName === 'qrID')) {
                console.log(chalk.red(columnName, " field is undefined at redirectURL"));
                res.json({
                    "code": config.errCode,
                    "status": "Error",
                    "message": columnName + " field is undefined"
                });
                return;
            }
        }
    }
    qrSchema.findOne({
        _id: req.body.qrID
    })
        .select({ qrCodeContent: 1, qrCodeType: 1, stats: 1 })
        .then(qrCodeInfo => {
            if (!qrCodeInfo) {
                res.json({
                    "code": config.errCode,
                    "status": "Error",
                    "message": config.errMessage,
                });
            } else {
                res.json({
                    "code": config.successCode,
                    "status": "OK",
                    qrData: qrCodeInfo.qrCodeContent,
                    qrType: qrCodeInfo.qrCodeType
                });
                if (!receivedValues.adminView || receivedValues.adminView == '0') {
                    let stats = qrCodeInfo.stats;

                    let today = new Date();
                    let dd = today.getDate();

                    let mm = today.getMonth() + 1;
                    let yyyy = today.getFullYear();
                    if (dd < 10) {
                        dd = '0' + dd;
                    }

                    if (mm < 10) {
                        mm = '0' + mm;
                    }
                    today = yyyy + '-' + mm + '-' + dd;

                    if (stats) {
                        let newData = false;
                        let statsArr = stats.map((item) => {
                            return new Promise((resolve) => {
                                asyncFunction(item, resolve);
                            });
                        });
                        function asyncFunction(item, callback) {
                            if (item.date == today) {
                                item.counter++;
                                newData = false;
                                callback();
                            } else {
                                newData = true;
                                callback();
                            }
                        }
                        Promise.all(statsArr).then(() => {
                            if (newData) {
                                stats.push({
                                    date: today,
                                    counter: 1
                                });
                            }
                            qrSchema.updateOne({ _id: req.body.qrID }, { '$set': { stats: stats } }, (err, result) => {
                                if (err) {
                                    console.log(err);
                                    return;
                                }
                            });
                        });
                    } else {
                        let fieldToSet = {
                            '$set': {
                                stats: [{
                                    date: today,
                                    counter: 1
                                }]
                            }
                        };
                        qrSchema.updateOne({ _id: req.body.qrID }, fieldToSet, (err, result) => {
                            if (err) {
                                console.log(err);
                                return;
                            }
                        });
                    }
                }
            }
        })
        .catch(err => {
            console.log(err);
            res.json({
                "code": config.errCode,
                "status": "Error",
                "message": config.errMessage,
            });
        })
};

exports.appSettings = (req, res) => {
    try {
        if (req.body.flag === 0) {
            let resultData = [];
            async.each(req.body.imagesArray, (imgName, callback) => {
                fs.exists(`./images/settings/${imgName}`, (success) => {
                    if (success) {
                        resultData.push({
                            name: imgName,
                            status: success
                        });
                        callback();
                    }
                    else if (!success) {
                        resultData.push({
                            name: imgName,
                            status: success
                        });
                        callback();
                    }
                });
            }, (err) => {
                if (err) {
                    res.json(err);
                    return;
                } else if (resultData.length > 0) {
                    res.json({
                        "code": config.successCode,
                        "data": resultData,
                        message: 'Files found sucessfully'
                    });
                    return;
                }
            })
        } else {
            fs.exists(`./images/settings/${req.body.imageName}.png`, (success) => {
                if (success) {
                    fs.unlink(`./images/settings/${req.body.imageName}.png`, function (err) {
                        if (err) { throw err }
                    });
                }
                let data = req.body.image.split(';');
                let imagePath;
                let base64Data;
                let image;
                if (data[0] == "data:image/png") {
                    imagePath = `./images/settings/${req.body.imageName}.png`;
                    base64Data = req.body.image.replace(/^data:image\/png;base64,/, "");
                    image = imagePath.split('./images/settings/')[1];
                }
                if (!imagePath || !base64Data) {
                    res.json({
                        "code": config.errCode,
                        success: false,
                        message: 'Failed to upload image please try again'
                    });
                } else {
                    fs.writeFile(imagePath, base64Data, 'base64', function (err) {
                        if (err) {
                            res.json({
                                "code": config.errCode,
                                success: false,
                                message: 'Failed to upload image please try again',
                                data: err
                            });
                            return;
                        } else {
                            res.json({
                                "code": config.successCode,
                                'status': 'Sucess',
                                "image": image,
                                message: 'File uploaded sucessfully'
                            });
                        }
                    });
                };
            })
        }
    } catch (e) {
        console.log(e);
        res.json({
            "code": config.errCode,
            'status': 'Error',
            "message": config.errMessage
        });
    }
};