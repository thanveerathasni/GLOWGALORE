const mongoose = require("mongoose")
const {Schema} = mongoose

const paymentSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
    },
    transactionId: {
        type: String,
        required: true,
        unique: true,
    },
    paymentMethod: {
        type: String,
        enum: ["credit_card", "debit_card", "net_banking", "UPI", "wallet"],
        required: true,
    },
    amountPaid: {
        type: Number,
        required: true,
    },
    paymentStatus: {
        type: String,
        enum: ["successful", "failed", "pending"],
        default: "pending",
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;

