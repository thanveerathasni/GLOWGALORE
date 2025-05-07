const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    orderedItems: [
        {
            productName: {
                type: String,
                required: false,
            },
            product: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            },
            price: {
                type: Number,
                default: 0
            },
            Image: {
                type: String,
                required: true, 
            },
            status: { 
                type: String,
                default: "Pending"
            },
            cancelReason: { 
                type: String
            }
        }
    ],
    totalPrice: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    finalAmount: {
        type: Number,
        required: true
    },
    address: {
        addressType: { type: String, required: true },
        name: { type: String, required: true },
        city: { type: String, required: true },
        landMark: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: Number, required: true },
        phone: { type: String, required: true },
        altPhone: { type: String, required: true }
    },
    deliveredDate: {
        type: Date
    },
    paymentMethod: {
        type: String,
    },
    status: {
        type: String,
        required: true,
        enum: ["Pending", "Processing", "Shipping", "Delivered", "Cancelled", "Return Request", "Returned"]
    },
    createdOn: {
        type: Date,
        default: Date.now,
        required: true 
    },
    updateOn: { 
        type: Date,
        default: Date.now,
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    
    returnReason: {
        type: String
    },
    returnDescription: {
        type: String
    },
    returnImages: [{
        type: String
    }],
    requestStatus: {
        type: String,
        enum: ["Pending", "approved", "rejected"]
    },
    cancelReason: { 
        type: String
    },
    invoiceDate: { 
        type: Date
    }
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
