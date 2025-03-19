const mongoose = require("mongoose")
const {Schema} = mongoose

const walletSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    balance: {
        type: Number,
        default: 0,
    },
    transactions: [
        {
            transactionId: String,
            amount: Number,
            date: {
                type: Date,
                default: Date.now,
            },
            type: {
                type: String,
                enum: ["credit", "debit"],
            },
        },
    ],
});

const Wallet = mongoose.model("Wallet", walletSchema);
module.exports = Wallet;
