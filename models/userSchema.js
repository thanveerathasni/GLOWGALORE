
const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
    //  referal: {
    //         type: String,
    //         default: () => uuidv4(),
    //         unique: true
    //     },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    profileImage: {
        type: String,
        default: '/Uploads/profiles/default-profile.jpg'
    },
    phone: {
        type: String,
        required: false,
        unique: false,
        sparse: true,
        default: null
    },
    googleId: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
        required: false,
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    isAdmin: {
        type: Boolean,
        default: false,
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
    appliedCoupon: {
        couponId: { type: Schema.Types.ObjectId, ref: "Coupon", default: null },
        code: { type: String, default: null },
        discountAmount: { type: Number, default: 0 }
    },
    availableCoupons: [{ 
        type: Schema.Types.ObjectId,
        ref: "Coupon"
    }],
    usedCoupons: [{ 
        type: Schema.Types.ObjectId,
        ref: "Coupon"
    }],
    wallet: {
        type: Number,
        default: 0,
        min: 0
    },
    walletTransactions: [{
        orderId: {
            type: String,
            required: false
        },
        amount: {
            type: Number,
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },
        reason: {
            type: String,
            enum: ["Cancelled", "Returned","Order Payment", null], 
            default: null 
        }
    }],
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],
    createdOn: {
        type: Date,
        default: Date.now,
    },
    referralCode: {
        type: String
    },
    redeemedUser: [{ 
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
        },
        brand: {
            type: String,
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }]
});

const User = mongoose.model("User", userSchema);
module.exports = User;




// const mongoose = require("mongoose")
// const{Schema} = mongoose;

// const userSchema = new Schema({
//     name:{
//         type:String,
//         required:true
//     },
//     email:{
//         type:String,
//         required:true,
//         unique:true,
//     },
//     profileImage: { type: String,
//          default: '/uploads/profiles/default-profile.jpg' },

//     phone:{
//         type : String,
//         required:false, // no use of phone number in single sign up 
//         unique:false,
//         sparse:true, // unique constrain 
//         default:null
//     },
//      googleId:{
//         type: String,
//         unique:true,
//     },
//     password:{
//         type:String,
//         required:false, // no use at time of single sign up
//     },
//     isBlocked:{
//         type:Boolean,
//         default:false,
//     },
//     isAdmin:{
//         type:Boolean,
//         default:false,
//     },
//     cart: [{
//         productId: {
//             type: Schema.Types.ObjectId,
//             ref: "Product",
//             required: true
//         },
//         quantity: {
//             type: Number,
//             required: true,
//             default: 1
//         }
//     }],
//     appliedCoupon: { // New field for coupon management
//         couponId: { type: Schema.Types.ObjectId, ref: "Coupon", default: null },
//         code: { type: String, default: null },
//         discountAmount: { type: Number, default: 0 }
//     },
//     usedCoupons: [{ // Added to track used coupons
//         type: Schema.Types.ObjectId,
//         ref: "Coupon"
//     }],

//     wallet: {
//         type: Number,
//         default: 0,  
//         min : 0
//       },
//     orderHistory:[{
//         type: Schema.Types.ObjectId,
//         ref: "Order"
//     }],
//     createdOn:{
//         type:Date,
//         default:Date.now,
//     },
//     referalCode:{
//         type: String
//     },
//     redeemed:{
//         type:Boolean,
//     },
//     redeemedUser:[{
//         type: Schema.Types.ObjectId,
//         ref:"User"

//     }],
//     searchHistory:[{
//         category:{
//             type: Schema.Types.ObjectId,
//             ref:"Category",
//         },
//         brand:{
//             type:String,
//         },
//         searchOn:{
//             type:Date,
//             default: Date.now
//         }

//     }]
    
// })

// const User = mongoose.model("User",userSchema)

// module.exports = User;