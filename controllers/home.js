const Job = require('../models/Job');

/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {
    if (req.user && req.user.__t === 'applicant') {
        Job.
            find({}).
            limit(10).
            sort({ date: -1} ).
            exec((err, jobs) => {
                res.render('home', {
                    title: 'Home',
                    jobs: jobs
                });
            });
    } else {
    res.render('home', {
        title: 'Home'
    });
}
};
