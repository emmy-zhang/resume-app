const mongoose = require('mongoose');
const User = require('../models/User').User;
const Applicant = require('../models/User').Applicant;
const Recruiter = require('../models/User').Recruiter;

const applicantSchema = new mongoose.Schema({
    userID: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    //times: [{time: Date, value: Boolean}]
});

const eventSchema = new mongoose.Schema({
    name: String,
    description: String,
    location: String,
    times: [{ time: Date, value: Boolean }],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    planners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    guests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Guest' }]
}, { timestamps: true });

const Guest = mongoose.model('Guest', guestSchema);
const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
