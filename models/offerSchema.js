// const mongoose = require("mongoose")
// const {Schema} = mongoose

// const offerSchema = new Schema({
//     offerName: {
//         type: String,
//         required: true,
//     },
//     description: {
//         type: String,
//     },
//     discountPercentage: {
//         type: Number,
//         required: true,
//     },
//     startDate: {
//         type: Date,
//         required: true,
//     },
//     endDate: {
//         type: Date,
//         required: true,
//     },
//     isActive: {
//         type: Boolean,
//         default: true,
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now,
//     },
// });

// const Offer = mongoose.model("Offer", offerSchema);
// module.exports = Offer;



const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    offerType: {
        type: String,
        enum: ['product', 'category'],
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: function() { return this.offerType === 'product'; }
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: function() { return this.offerType === 'category'; }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Offer', offerSchema);