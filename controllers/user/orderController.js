const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");

const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

// Get Orders Page
const getOrders = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        if (!user) return res.status(404).send('User not found');

        // Pagination parameters
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 5; // Default to 5 orders per page
        const skip = (page - 1) * limit;

        // Fetch total count of orders for pagination
        const totalOrders = await Order.countDocuments({ userId });

        // Fetch paginated orders
        const orders = await Order.find({ userId })
            .populate('orderedItems.product')
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit);

        res.render('orders', { 
            user, 
            orders, 
            currentPage: page, 
            totalPages: Math.ceil(totalOrders / limit), 
            limit // Pass limit for frontend consistency
        });
    } catch (error) {
        console.error('Error in getOrdersPage:', error);
        res.status(500).send('An error occurred while loading the orders page');
    }
};

// Load Order Details
const loadOrderDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.query.orderId;

        const order = await Order.findOne({ orderId: orderId, userId })
            .populate('orderedItems.product');
        
        if (!order) {
            return res.status(404).send("Order not found");
        }

        const user = await User.findById(userId);

        res.render("order-details", {
            order,
            user,
        });
    } catch (error) {
        console.error("Error in loadOrderDetails:", error);
        res.status(500).send("Internal server error");
    }
};

// Cancel Order
const cancelOrder = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        const userId = req.session.user;

        const order = await Order.findOne({ _id: orderId, userId })
            .populate('orderedItems.product');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: "Order not found" 
            });
        }

        if (order.status === "Cancelled" || order.status === "Delivered") {
            return res.status(400).json({ 
                success: false, 
                message: "Order cannot be Cancelled at this stage" 
            });
        }

        // Update order status
        order.status = "Cancelled";
        order.cancelReason = reason;
        order.updateOn = new Date();

        // Update ordered item status
        order.orderedItems.forEach(item => {
            item.status = "Cancelled";
            item.cancelReason = reason;
        });

        // Restore product quantity
        for (const item of order.orderedItems) {
            await Product.findByIdAndUpdate(item.product._id, {
                $inc: { quantity: item.quantity }
            });
        }

        // Handle refund if payment was online or wallet
        if (order.paymentMethod === "online" || order.paymentMethod === "wallet") {
            const refundSuccess = await processRefund(userId, order);
            if (!refundSuccess) {
                return res.status(500).json({
                    success: false,
                    message: "Failed to process refund",
                });
            }
        }

        await order.save();
        return res.json({ 
            success: true, 
            message: "Order Cancelled successfully" 
        });

    } catch (error) {
        console.error("Error in cancelOrder:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error: " + error.message 
        });
    }
};

// Generate Invoice
const generateInvoice = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.query.orderId;

        const order = await Order.findOne({ orderId: orderId, userId });
        if (!order) {
            return res.status(404).send("Order not found");
        }

        if (order.status !== "Delivered") {
            return res.status(400).send("Invoice is only available for delivered orders");
        }

        if (!order.invoiceDate) {
            order.invoiceDate = new Date();
            await order.save();
        }

        const templatePath = path.join(__dirname, "../../views/user/invoice-template.ejs");
        const html = await ejs.renderFile(templatePath, { order });

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: "networkidle0" });

        const invoiceDir = path.join(__dirname, "../../public/invoices");
        if (!fs.existsSync(invoiceDir)) {
            fs.mkdirSync(invoiceDir, { recursive: true });
        }

        const fileName = `invoice-${order.orderId}.pdf`;
        const filePath = path.join(invoiceDir, fileName);

        await page.pdf({
            path: filePath,
            format: "A4",
            printBackground: true,
            margin: {
                top: "20px",
                right: "20px",
                bottom: "20px",
                left: "20px",
            },
        });

        await browser.close();

        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error("Error sending file:", err);
                res.status(500).send("Error generating invoice");
            }
        });
    } catch (error) {
        console.error("Error generating invoice:", error);
        res.status(500).send("Error generating invoice");
    }
};

// Request Return
const requestReturn = async (req, res) => {
    try {
        const { orderId, returnReason, returnDescription } = req.body;
        const userId = req.session.user;
        const files = req.files;

        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const deliveryDate = order.deliveredDate ? new Date(order.deliveredDate) : new Date(order.updateOn);
        const currentDate = new Date();
        const daysSinceDelivery = Math.floor((currentDate - deliveryDate) / (1000 * 60 * 60 * 24));

        console.log(`Order ${order.orderId}: status=${order.status}, deliveredDate=${order.deliveredDate}, daysSinceDelivery=${daysSinceDelivery}`);

        if (order.status !== "Delivered" || daysSinceDelivery > 7) {
            return res.status(400).json({
                success: false,
                message: "Order is not eligible for return",
            });
        }

        let imagePaths = [];
        if (files && files.length > 0) {
            imagePaths = files.map((file) => `uploads/returns/${file.filename}`);
        }
        order.status = "Return Request";
        order.returnReason = returnReason;
        order.returnDescription = returnDescription;
        order.returnImages = imagePaths;
        order.requestStatus = "Pending";

        order.updateOn = new Date();

        await order.save();

        res.json({
            success: true,
            message: "Return request submitted successfully",
        });
    } catch (error) {
        console.error("Error in requestReturn:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Cancel Return Request
const cancelReturnRequest = async (req, res) => {
    try {
        const { orderId } = req.body;
        const userId = req.session.user;

        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Check if the order is in "Return Request" status and requestStatus is "Pending"
        if (order.status !== "Return Request" || order.requestStatus !== "Pending") {
            return res.status(400).json({
                success: false,
                message: "Return request cannot be cancelled",
            });
        }

        // Reset return-related fields and revert status to "Delivered"
        order.status = "Delivered";
        order.returnReason = undefined;
        order.returnDescription = undefined;
        order.returnImages = [];
        order.requestStatus = undefined;
        order.adminMessage = undefined; // Note: adminMessage isn't in schema, remove if not needed
        order.updateOn = new Date();

        await order.save();

        res.json({
            success: true,
            message: "Return request cancelled successfully",
        });
    } catch (error) {
        console.error("Error in cancelReturnRequest:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};




module.exports = {
    getOrders,
    loadOrderDetails,
    cancelOrder,
    generateInvoice,
    requestReturn,
    cancelReturnRequest,
};


