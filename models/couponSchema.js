const mongoose = require("mongoose")
const {Schema} = mongoose

const couponSchema = new Schema({
    couponCode: {
        type: String,
        required: true,
        unique: true,
    },
    discountPercentage: {
        type: Number,
        required: true,
    },
    minCartValue: {
        type: Number,
    },
    expiryDate: {
        type: Date,
        required: true,
    },
    isListed: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }
});

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
