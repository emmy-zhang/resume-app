const Applicant = require('../models/User').Applicant;
const Job = require('../models/Job');

/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {
    if (req.user) {
        if (req.user.__t === 'applicant') {
            Job.
            find({}).
            limit(10).
            sort({
                date: -1
            }).
            exec((err, jobs) => {
                res.render('home', {
                    title: 'Home',
                    jobs: jobs
                });
            });
        } else if (req.user.__t === 'recruiter') {
            Applicant.
            find({}).
            limit(10).
            sort({
                date: -1
            }).
            exec((err, users) => {
                res.render('home', {
                    title: 'Home',
                    users: users
                });
            });
        }
    } else {
        res.render('home', {
            title: 'Home'
        });
    }
};
