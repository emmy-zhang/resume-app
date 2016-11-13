const mongoose = require('mongoose');
const User = require('../models/User').User;
const Applicant = require('../models/User').Applicant;
const Recruiter = require('../models/User').Recruiter;

const jobSchema = new mongoose.Schema({
    name: String,
    description: String,
    location: String,
    company: String,
    applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Applicant' }],
    recruiters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recruiter' }]
}, { timestamps: true });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
