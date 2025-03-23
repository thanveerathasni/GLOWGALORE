const mongoose = require("mongoose")
const {Schema} = mongoose;

const bannerSchema = new Schema({
    imageUrl: {
        type: String,
        required: false,
    },
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
    },
    redirectUrl: {
        type: String,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    expiredAt:{
        type:Date,
        //required:true
    }
});

const Banner = mongoose.model("Banner", bannerSchema);
module.exports = Banner;
