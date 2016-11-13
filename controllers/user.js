const async = require('async');
const crypto = require('crypto');
const fs = require('fs');
const nodemailer = require('nodemailer');
const passport = require('passport');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

const User = require('../models/User').User;
const Applicant = require('../models/User').Applicant;
const Recruiter = require('../models/User').Recruiter;

const config = new AWS.Config({
    accessKeyId: process.env.S3_ID,
    secretAccessKey: process.env.S3_SECRET,
    region: process.env.S3_REGION,
    params: {
        Bucket: process.env.S3_BUCKET
    }
});

const s3 = new AWS.S3(config);

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    res.render('account/login', {
        title: 'Log in'
    });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
    req.assert('email', 'Email is not valid.').isEmail();
    req.assert('password', 'Password cannot be blank.').notEmpty();
    req.sanitize('email').normalizeEmail({
        remove_dots: false
    });

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/login');
    }

    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return next(err);
        }
        if (!user) {
            req.flash('errors', info);
            return res.redirect('/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            req.flash('success', {
                msg: 'Success! You are logged in.'
            });
            res.redirect(req.session.returnTo || '/');
        });
    })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
    req.logout();
    res.redirect('/');
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    res.render('account/signup', {
        title: 'Create Account'
    });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = (req, res, next) => {
    console.log("req.body: " + JSON.stringify(req.body));
    req.assert('email', 'Email is not valid.').isEmail();
    req.assert('password', 'Password must be at least 4 characters long.').len(4);
    req.assert('confirmPassword', 'Passwords do not match.').equals(req.body.password);
    req.sanitize('email').normalizeEmail({
        remove_dots: false
    });

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/signup');
    }

    var user;
    if (req.body.type === 'recruiter') {
        user = new Recruiter({
            profile: {
                firstName: req.body.firstName,
                lastName: req.body.lastName
            },
            email: req.body.email,
            password: req.body.password,
            openings: []
        });
    } else if (req.body.type === 'applicant') {
        user = new Applicant({
            profile: {
                firstName: req.body.firstName,
                lastName: req.body.lastName
            },
            email: req.body.email,
            password: req.body.password,
            applications: []
        });
    }

    User.findOne({
        email: req.body.email
    }, (err, existingUser) => {
        if (existingUser) {
            req.flash('errors', {
                msg: 'Account with that email address already exists.'
            });
            return res.redirect('/signup');
        }
        user.save((err) => {
            if (err) {
                return next(err);
            }
            req.logIn(user, (err) => {
                if (err) {
                    return next(err);
                }
                res.redirect('/');
            });
        });
    });
};

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
    res.render('account/profile', {
        title: 'Account Management'
    });
};

/**
 * POST /account/type
 * Update account type information.
 */
exports.postAccountType = (req, res, next) => {
    console.log(req.body);
    req.assert('type', 'Please choose a valid account type.').isValidUserType();

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/');
    }


    User.findById(req.user.id, (err, user) => {
        if (err) {
            return next(err);
        }
        var newUser;
        if (req.body.type === "applicant") {
            newUser = new Applicant({
                email: user.email,
                password: user.password || '',
                passwordResetToken: user.passwordResetToken || '',
                passwordResetExpires: user.passwordResetToken || '',

                facebook: user.facebook,
                google: user.google,
                github: user.github,
                tokens: user.tokens,

                profile: {
                    firstName: user.profile.firstName,
                    lastName: user.profile.lastName,
                    location: user.profile.location,
                    website: user.profile.website,
                    picture: user.profile.picture
                },
            });
        } else if (req.body.type === "recruiter") {
            newUser = new Recruiter({
                email: user.email,
                password: user.password || '',
                passwordResetToken: user.passwordResetToken || '',
                passwordResetExpires: user.passwordResetToken || '',

                facebook: user.facebook,
                google: user.google,
                github: user.github,
                tokens: user.tokens,

                profile: {
                    firstName: user.profile.firstName,
                    lastName: user.profile.lastName,
                    location: user.profile.location,
                    website: user.profile.website,
                    picture: user.profile.picture
                },
            });
        }
        User.remove({
            _id: req.user.id
        }, (err) => {
            if (err) {
                return next(err);
            }
            newUser.save((err) => {
                if (err) {
                    if (err.code === 11000) {
                        req.flash('errors', {
                            msg: 'The email address you have entered is already associated with an account.'
                        });
                        return res.redirect('/account');
                    }
                    return next(err);
                }
                req.logIn(newUser, (err) => {
                    if (err) {
                        return next(err);
                    }
                    req.flash('success', {
                        msg: 'Your account type has been updated.'
                    });
                    res.redirect('/');
                });
            });
        });

    });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
    req.assert('email', 'Please enter a valid email address.').isEmail();
    req.assert('website', 'Please enter a valid URL.').optional({
        checkFalsy: true
    }).isURL();
    req.sanitize('email').normalizeEmail({
        remove_dots: false
    });

    /*if (req.file) {
        console.log('req.file: ' + req.file);
        req.assert(req.file, 'Please upload a valid PDF.').isValidPDF();
    }*/

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/account');
    }
    console.log(req.body);

    User.findById(req.user.id, (err, user) => {
        console.log(user.email);
        console.log(user.profile.resume);
        if (err) {
            return next(err);
        }
        user.email = req.body.email || '';
        user.profile.firstName = req.body.firstName || '';
        user.profile.lastName = req.body.lastName || '';
        user.profile.gender = req.body.gender || '';
        user.profile.location = req.body.location || '';
        user.profile.website = req.body.website || '';

        console.log(req.file);

        if (req.file) {
            const filename = req.user.id + ".pdf";
            uploadToS3(req.file, filename, function(err, data) {
                console.log('data: ' + JSON.stringify(data));
                if (err) {
                    console.error(err);
                    return res.status(500).send('Failed to upload to S3.').end();
                }
                user.profile.resume = data.Location;
                user.save((err) => {
                    if (err) {
                        if (err.code === 11000) {
                            req.flash('errors', {
                                msg: 'The email address you have entered is already associated with an account.'
                            });
                            return res.redirect('/account');
                        }
                        return next(err);
                    }
                    req.flash('success', {
                        msg: 'Profile information has been updated.'
                    });
                    res.redirect('/account');
                });
            });
        } else {
            user.save((err) => {
                if (err) {
                    if (err.code === 11000) {
                        req.flash('errors', {
                            msg: 'The email address you have entered is already associated with an account.'
                        });
                        return res.redirect('/account');
                    }
                    return next(err);
                }
                req.flash('success', {
                    msg: 'Profile information has been updated.'
                });
                res.redirect('/account');
            });
        }
    });
};

function uploadToS3(file, fileName, callback) {
    s3.upload({
        Bucket: process.env.S3_BUCKET,
        Body: file.buffer,
        Key: fileName.toString(),
        ContentType: 'application/octet-stream',
        ACL: 'public-read'
    }).send(callback);
}

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
    req.assert('password', 'Password must be at least 4 characters long.').len(4);
    req.assert('confirmPassword', 'Passwords do not match.').equals(req.body.password);

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/account');
    }

    User.findById(req.user.id, (err, user) => {
        if (err) {
            return next(err);
        }
        user.password = req.body.password;
        user.save((err) => {
            if (err) {
                return next(err);
            }
            req.flash('success', {
                msg: 'Password has been changed.'
            });
            res.redirect('/account');
        });
    });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
    User.remove({
        _id: req.user.id
    }, (err) => {
        if (err) {
            return next(err);
        }
        req.logout();
        req.flash('info', {
            msg: 'Your account has been deleted.'
        });
        res.redirect('/');
    });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = (req, res, next) => {
    const provider = req.params.provider;
    User.findById(req.user.id, (err, user) => {
        if (err) {
            return next(err);
        }
        user[provider] = undefined;
        user.tokens = user.tokens.filter(token => token.kind !== provider);
        const providerFormatted = provider.charAt(0).toUpperCase() + provider.slice(1);
        user.save((err) => {
            if (err) {
                return next(err);
            }
            req.flash('info', {
                msg: `${providerFormatted} account has been unlinked.`
            });
            res.redirect('/account');
        });
    });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    User
        .findOne({
            passwordResetToken: req.params.token
        })
        .where('passwordResetExpires').gt(Date.now())
        .exec((err, user) => {
            if (err) {
                return next(err);
            }
            if (!user) {
                req.flash('errors', {
                    msg: 'Password reset token is invalid or has expired.'
                });
                return res.redirect('/forgot');
            }
            res.render('account/reset', {
                title: 'Password Reset'
            });
        });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
    req.assert('password', 'Password must be at least 4 characters long.').len(4);
    req.assert('confirm', 'Passwords must match.').equals(req.body.password);

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('back');
    }

    async.waterfall([
        function(done) {
            User
                .findOne({
                    passwordResetToken: req.params.token
                })
                .where('passwordResetExpires').gt(Date.now())
                .exec((err, user) => {
                    if (err) {
                        return next(err);
                    }
                    if (!user) {
                        req.flash('errors', {
                            msg: 'Password reset token is invalid or has expired.'
                        });
                        return res.redirect('back');
                    }
                    user.password = req.body.password;
                    user.passwordResetToken = undefined;
                    user.passwordResetExpires = undefined;
                    user.save((err) => {
                        if (err) {
                            return next(err);
                        }
                        req.logIn(user, (err) => {
                            done(err, user);
                        });
                    });
                });
        },
        function(user, done) {
            const transporter = nodemailer.createTransport({
                service: 'SendGrid',
                auth: {
                    user: process.env.SENDGRID_USER,
                    pass: process.env.SENDGRID_PASSWORD
                }
            });
            const mailOptions = {
                to: user.email,
                from: 'meetchu@meetchu.com',
                subject: 'Your Meetchu password has been changed',
                text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
            };
            transporter.sendMail(mailOptions, (err) => {
                req.flash('success', {
                    msg: 'Success! Your password has been changed.'
                });
                done(err);
            });
        }
    ], (err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render('account/forgot', {
        title: 'Forgot Password'
    });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = (req, res, next) => {
    req.assert('email', 'Please enter a valid email address.').isEmail();
    req.sanitize('email').normalizeEmail({
        remove_dots: false
    });

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/forgot');
    }

    async.waterfall([
        function(done) {
            crypto.randomBytes(16, (err, buf) => {
                const token = buf.toString('hex');
                done(err, token);
            });
        },
        function(token, done) {
            User.findOne({
                email: req.body.email
            }, (err, user) => {
                if (!user) {
                    req.flash('errors', {
                        msg: 'Account with that email address does not exist.'
                    });
                    return res.redirect('/forgot');
                }
                user.passwordResetToken = token;
                user.passwordResetExpires = Date.now() + 3600000; // 1 hour
                user.save((err) => {
                    done(err, token, user);
                });
            });
        },
        function(token, user, done) {
            const transporter = nodemailer.createTransport({
                service: 'SendGrid',
                auth: {
                    user: process.env.SENDGRID_USER,
                    pass: process.env.SENDGRID_PASSWORD
                }
            });
            const mailOptions = {
                to: user.email,
                from: 'hello@resumeapp.com',
                subject: 'Reset your password on Resume App',
                text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
                    Please click on the following link, or paste this into your browser to complete the process:\n\n
                    http://${req.headers.host}/reset/${token}\n\n
                    If you did not request this, please ignore this email and your password will remain unchanged.\n`
            };
            transporter.sendMail(mailOptions, (err) => {
                req.flash('info', {
                    msg: `An e-mail has been sent to ${user.email} with further instructions.`
                });
                done(err);
            });
        }
    ], (err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/forgot');
    });
};
