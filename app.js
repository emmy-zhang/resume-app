// Dependencies
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const sass = require('node-sass-middleware');

// Controllers
const homeController = require('./controllers/home');

// Create Express server
const app = express();

// App routes
app.get('/', homeController.index);

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
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

// Start Express server
app.listen(app.get('port'), () => {
    console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;
