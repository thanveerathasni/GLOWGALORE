const User = require("../../models/userSchema")
const Address = require("../../models/addressSchema")
const Order = require("../../models/orderSchema")
// Get orders for the authenticated user
const getOrders = async (req, res) => {
    try {
        const userId = req.session.user; // Assuming user ID is stored in session
        const orders = await Order.find({ userId: userId }); // Fetch orders for the user
        res.render('orders', { orders }); // Render the order management page with orders
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.redirect('/pageNotFound'); // Handle error
    }
};

// Cancel an order
const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const { cancelReason } = req.body; // Get cancellation reason from the request body

        // Logic to cancel the order and increment stock
        const order = await Order.findById(orderId);
        if (order) {
            // Increment stock logic here
            // ...

            order.status = 'Cancelled';
            order.cancelReason = cancelReason; // Store the reason if provided
            await order.save();
            res.redirect('/orders'); // Redirect back to orders page
        } else {
            res.redirect('/pageNotFound'); // Order not found
        }
    } catch (error) {
        console.error("Error canceling order:", error);
        res.redirect('/pageNotFound'); // Handle error
    }
};

// Return an order
const returnOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const { returnReason } = req.body; // Get return reason from the request body

        // Logic to return the order and increment stock
        const order = await Order.findById(orderId);
        if (order) {
            // Increment stock logic here
            // ...

            order.status = 'Returned';
            order.returnReason = returnReason; // Store the reason
            await order.save();
            res.redirect('/orders'); // Redirect back to orders page
        } else {
            res.redirect('/pageNotFound'); // Order not found
        }
    } catch (error) {
        console.error("Error returning order:", error);
        res.redirect('/pageNotFound'); // Handle error
    }
};

// Download invoice
const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);
        if (order) {
            // Logic to generate and send the invoice PDF
            // ...
            res.download(invoicePath); // Send the invoice file
        } else {
            res.redirect('/pageNotFound'); // Order not found
        }
    } catch (error) {
        console.error("Error downloading invoice:", error);
        res.redirect('/pageNotFound'); // Handle error
    }
};

// Get order details
const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);
        if (order) {
            res.render('orderDetails', { order }); // Render order details page
        } else {
            res.redirect('/pageNotFound'); // Order not found
        }
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.redirect('/pageNotFound'); // Handle error
    }
};

module.exports = {
    getOrders,
    cancelOrder,
    returnOrder,
    downloadInvoice,
    getOrderDetails,
};