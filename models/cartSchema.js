const { CancellationToken } = require("mongodb");
const mongoose = require("mongoose")
const {Schema} = mongoose

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    items: [
        {
            productId: {
                type: Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                default: 1,
            },
            price:{
                type: Number,
                required: true,
            },
            status:{
                type: String,
               default: 'placed',
            },
            
        },
    ],
    totalAmount: {
        type: Number,
        required: true,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
