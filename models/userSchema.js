const mongoose = require("mongoose")
const{Schema} = mongoose;

const userSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    profileImage:{
        type: String,
        default: '/path/to/default-profile.jpg' // Match with HTML default image

    },
    phone:{
        type : String,
        required:false, // no use of phone number in single sign up 
        unique:false,
        sparse:true, // unique constrain 
        default:null
    },
     googleId:{
        type: String,
        unique:true,
    },
    password:{
        type:String,
        required:false, // no use at time of single sign up
    },
    isBlocked:{
        type:Boolean,
        default:false,
    },
    isAdmin:{
        type:Boolean,
        default:false,
    },
    cart: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            default: 1
        }
    }],
    wallet:[{
        type: Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
    orderHistory:[{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],
    createdOn:{
        type:Date,
        default:Date.now,
    },
    referalCode:{
        type: String
    },
    redeemed:{
        type:Boolean,
    },
    redeemedUser:[{
        type: Schema.Types.ObjectId,
        ref:"User"

    }],
    searchHistory:[{
        category:{
            type: Schema.Types.ObjectId,
            ref:"Category",
        },
        brand:{
            type:String,
        },
        searchOn:{
            type:Date,
            default: Date.now
        }

    }]
    
})

const User = mongoose.model("User",userSchema)

module.exports = User;