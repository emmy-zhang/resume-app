const mongoose = require('mongoose');
const User = require('../models/User').User;
const Applicant = require('../models/User').Applicant;
const Recruiter = require('../models/User').Recruiter;

const jobApplicantSchema = new mongoose.Schema({
    userID: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Applicant' }],
    qualifications: [ String ]
});

const jobSchema = new mongoose.Schema({
    name: String,
    description: String,
    location: String,
    company: String,
    applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'JobApplicant' }],
    recruiters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recruiters' }]
}, { timestamps: true });

const JobApplicant = mongoose.model('JobApplicant', jobApplicantSchema);
const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
