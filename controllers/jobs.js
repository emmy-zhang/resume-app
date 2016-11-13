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
const Job = require('../models/Job');

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
 * GET /jobs/create
 * Job creation page.
 */
exports.getJobsCreate = (req, res) => {
    res.render('jobs/create', {
        title: 'Create job'
    });
};

/**
 * POST /jobs/create
 * Create a new job.
 */
exports.postJobsCreate = (req, res, next) => {
    req.assert('description', 'The description must be less than 140 characters.').len(0, 140);

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/jobs/create');
    }

    const job = new Job({
        name: req.body.name,
        description: req.body.description || '',
        location: req.body.location,
        company: req.body.company,
        skills: req.body.skills.split(/[ ,]+/),
        owner: {
            id: req.user._id,
            name: req.user.profile.firstName + " " + req.user.profile.lastName
        },
        recruiters: [req.user._id]
    });

    console.log(job);
    console.log(JSON.stringify(job));

    job.save((err) => {
        if (err) {
            return next(err);
        }
        Recruiter.findByIdAndUpdate(req.user._id, {
            $push: {
                'openings': {
                    name: job.name,
                    id: job._id
                }
            }
        }, {
            'new': true
        }, (err) => {
            if (err) {
                return next(err);
            }
            return res.redirect('/jobs/' + job._id);
        });
    });
};

/**
 * GET /jobs/:id
 * Job page.
 */
exports.getJob = (req, res) => {
    Job.findById(req.params.id, (err, job) => {
        if (err) {
            return next(err);
        }
        res.render('jobs/job', {
            title: 'Job',
            job: job
        });
    });
};

/**
 * POST /jobs/:id
 * Update job information.
 */
exports.postJob = (req, res) => {
    Job.findById(req.params.id, (err, job) => {
        if (err) {
            return next(err);
        }
        job.name = req.body.name;
        job.description = req.body.description || '';
        job.location = req.body.location;
        job.company = req.body.company;
        job.skills = req.body.skills.split(/[ ,]+/);
        job.owner.id = req.user._id;
        job.owner.name = req.user.profile.firstName + " " + req.user.profile.lastName;
        job.save((err) => {
            if (err) {
                return next(err);
            }
            req.flash('success', {
                msg: 'Job opening information has been updated.'
            });
            res.render('jobs/job', {
                title: 'Job',
                job: job
            });
        });
    });
};

/**
 * POST /jobs/:id/delete
 * Delete job page.
 */
exports.deleteJob = (req, res) => {
    const id = req.params.id;
    Job.remove({
        _id: id
    }, (err) => {
        if (err) {
            return next(err);
        }
        req.flash('info', {
            msg: 'The job opening has been deleted.'
        });
        Recruiter.update({
            _id: req.user._id
        }, {
            $pull: {
                openings: {
                    id: id
                }
            }
        }, (err) => {
            if (err) {
                return next(err);
            }
            return res.redirect('/');
        });
    });
};

/**
 * GET /jobs/:id/apply
 * Job application page.
 */
exports.getJobApply = (req, res) => {
    Job.findById(req.params.id, (err, job) => {
        if (err) {
            return next(err);
        }
        res.render('jobs/apply', {
            title: 'Job Application',
            job: job
        });
    });
};

/**
 * POST /jobs/:id/apply
 * Apply to a job.
 */
exports.postJobApply = (req, res) => {
    if (req.user) {
        req.flash('error', {
            msg: 'You are not logged in.'
        });
        res.redirect('back');
    } else if (req.user !== 'applicant') {
        req.flash('error', {
            msg: 'You are not an applicant.'
        });
        res.redirect('back');
    } else {
        Job.findById(req.params.id, (err, job) => {
            if (err) {
                return next(err);
            }
            if (job.applicants.indexOf(req.user.id) != -1) {
                req.flash('error', {
                    msg: 'You have already applied to this job.'
                });
                res.redirect('back');
            }
            job.applicants.push({
                name: req.user.profile.firstName + " " + req.user.profile.lastName,
                id: req.user.id
            });
            job.save((err) => {
                if (err) {
                    return next(err);
                }
                req.flash('success', {
                    msg: 'Job opening information has been updated.'
                });
                res.render('jobs/job', {
                    title: 'Job',
                    job: job
                });
            });
        });
    }
};
