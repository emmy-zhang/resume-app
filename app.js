// Dependencies
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const lusca = require('lusca');
const dotenv = require('dotenv');
const path = require('path');
const sass = require('node-sass-middleware');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const mongoose = require('mongoose');
const passport = require('passport');
const expressValidator = require('express-validator');
const multer = require('multer');
const upload = multer({
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

// Load environmental variables from .env
dotenv.load({
    path: '.env'
});

// Controllers
const homeController = require('./controllers/home');
const contactController = require('./controllers/contact');
const userController = require('./controllers/user');
const jobController = require('./controllers/jobs');

// Passport config
const passportConfig = require('./config/passport');

// Create Express server
const app = express();

// MongoDB
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
mongoose.connection.on('error', () => {
    console.error('MongoDB Connection Error. Please make sure that MongoDB is running.');
    process.exit(1);
});

// Express config
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(compression());
app.use(sass({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public')
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(expressValidator({
    customValidators: {
        isValidPDF: function(file) {
            return file.mimetype && file.mimetype === 'application/pdf';
        },
        isValidUserType: function(type) {
            console.log(type);
            return type === 'recruiter' || type === 'applicant';
        }
    }
}));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
        url: process.env.MONGOLAB_URI || process.env.MONGODB_URI,
        autoReconnect: true
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
/*app.use((req, res, next) => {
    if (req.path === '/account/profile' || req.path === '/account/type' || req.path === '/') {
        next();
    } else {
        lusca.csrf()(req, res, next);
    }
});*/
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});
app.use(function(req, res, next) {
    // After successful login, redirect back to the intended page
    if (!req.user &&
        req.path !== '/login' &&
        req.path !== '/signup' &&
        !req.path.match(/^\/auth/) &&
        !req.path.match(/\./)) {
        req.session.returnTo = req.path;
    }
    next();
});
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 31557600000
}));

// App routes
app.get('/', homeController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
app.get('/account', passportConfig.isAuthenticated, userController.getAccount);
app.post('/account/type', passportConfig.isAuthenticated, userController.postAccountType);
app.post('/account/profile', passportConfig.isAuthenticated, upload.single('resume'), userController.postUpdateProfile);
app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get('/account/unlink/:provider', passportConfig.isAuthenticated, userController.getOauthUnlink);
app.get('/jobs/create', passportConfig.isAuthenticated, jobController.getJobsCreate);
app.post('/jobs/create', passportConfig.isAuthenticated, jobController.postJobsCreate);
app.get('/jobs/:id', passportConfig.isAuthenticated, jobController.getJob);
app.post('/jobs/:id', passportConfig.isAuthenticated, jobController.postJob);
app.get('/jobs/:id/apply', passportConfig.isAuthenticated, jobController.getJobApply);
app.post('/jobs/:id/apply', passportConfig.isAuthenticated, jobController.postJobApply);
app.post('/jobs/:id/delete', passportConfig.isAuthenticated, jobController.deleteJob);
app.get('/user/:id', passportConfig.isAuthenticated, userController.getUser);
app.post('/user/:id/connect', passportConfig.isAuthenticated, userController.postConnectUser);
app.post('/user/:id/disconnect', passportConfig.isAuthenticated, userController.postDisconnectUser);

// OAuth authentication routes. (Sign in)
app.get('/auth/facebook', passport.authenticate('facebook', {
    scope: ['email', 'user_location']
}));
app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    failureRedirect: '/login'
}), (req, res) => {
    res.redirect(req.session.returnTo || '/');
});
app.get('/auth/google', passport.authenticate('google', {
    scope: 'profile email'
}));
app.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/login'
}), (req, res) => {
    res.redirect(req.session.returnTo || '/');
});
app.get('/auth/linkedin', passport.authenticate('linkedin', {
    state: 'SOME STATE'
}));
app.get('/auth/linkedin/callback', passport.authenticate('linkedin', {
    failureRedirect: '/login'
}), (req, res) => {
    res.redirect(req.session.returnTo || '/');
});

// Start Express server
app.listen(app.get('port'), () => {
    console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;
