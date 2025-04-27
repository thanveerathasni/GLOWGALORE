const mongoose = require("mongoose")
const {Schema} = mongoose

const couponSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true,
      match: /^[A-Za-z0-9]{1,50}$/
    },
    createdOn: {
      type: Date,
      required: true,
      default: Date.now
    },
    expireOn: {
      type: Date,
      required: true
    },
    offerPrice: {
      type: Number,
      required: true,
      min: 0
    },
    minimumPrice: {
      type: Number,
      required: true,
      min: 0
    },
    isList: {
      type: Boolean,
      default: true
    }
  });
const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
