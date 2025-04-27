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
                required: true, // Note: "require" was misspelled as "require" in original
            },
            status: { // Added to support item-level status in cancelOrder
                type: String,
                default: "Pending"
            },
            cancelReason: { // Added to support item-level cancel reason in cancelOrder
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
        required: true // Note: "reqired" was misspelled as "reqired" in original
    },
    updateOn: { // Note: "updateOn" was misspelled as "updateOn" in original (assuming typo)
        type: Date,
        default: Date.now,
    },
    couponApplied: {
        type: Boolean,
        default: false
    },
    // Added fields to match frontend and backend
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
    cancelReason: { // Added to support order-level cancel reason in cancelOrder
        type: String
    },
    invoiceDate: { // Added to support generateInvoice
        type: Date
    }
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
