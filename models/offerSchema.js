const mongoose = require("mongoose")
const {Schema} = mongoose

const offerSchema = new Schema({
    offerName: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    discountPercentage: {
        type: Number,
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Offer = mongoose.model("Offer", offerSchema);
module.exports = Offer;
