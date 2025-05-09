

const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");

const fs = require("fs");
const path = require("path");
const  Razorpay = require("razorpay");

const ejs = require("ejs");

const puppeteer = require("puppeteer");

// Get Orders Page
const getOrders = async (req, res) => {
  try {
    const userId = req.session.user;
    const user = await User.findById(userId);
    if (!user) return res.status(404).send('User not found');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({ userId });

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
      limit,
    });
  } catch (error) {
    console.error('Error in getOrdersPage:', error);
    res.status(500).send('An error occurred while loading the orders page');
  }
};


const loadOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user;
    const orderId = req.query.orderId;

    const order = await Order.findOne({ orderId: orderId, userId })
      .populate('orderedItems.product');
    
    if (!order) {
      return res.status(404).send("Order not found");
    }

    let deliveryDate = null;
    if (order.deliveredDate && !isNaN(new Date(order.deliveredDate))) {
      deliveryDate = new Date(order.deliveredDate);
    } else if (order.updateOn && !isNaN(new Date(order.updateOn))) {
      deliveryDate = new Date(order.updateOn);
    }

   

    const user = await User.findById(userId);

    res.render("order-details", {
      order,
      user,
      deliveryDate,
    });
  } catch (error) {
    console.error("Error in loadOrderDetails:", error);
    res.status(500).send("Internal server error");
  }
};


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

    order.status = "Cancelled";
    order.cancelReason = reason;
    order.updateOn = new Date();

    order.orderedItems.forEach(item => {
      item.status = "Cancelled";
      item.cancelReason = reason;
    });
    
    for (const item of order.orderedItems) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { quantity: item.quantity },
      });
    }

    if (order.paymentMethod === "razorpay" || order.paymentMethod === "wallet") {
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

const requestReturn = async (req, res) => {
  try {
    const { orderId, returnReason, returnDescription } = req.body;
    const userId = req.session.user;
    // const files = req.files;

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

    // let imagePaths = [];
    // if (files && files.length > 0) {
    //   imagePaths = files.map((file) => `uploads/returns/${file.filename}`);
    // }
    order.status = "Return Request";
    order.returnReason = returnReason;
    order.returnDescription = returnDescription;
    // order.returnImages = imagePaths;
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

const cancelReturnRequest = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.session.user;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "Return Request" || order.requestStatus !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Return request cannot be cancelled",
      });
    }

    order.status = "Delivered";
    order.returnReason = undefined;
    order.returnDescription = undefined;
    // order.returnImages = [];
    order.requestStatus = undefined;
    order.adminMessage = undefined; 
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

async function processRefund(userId, order) {
  try {
    const user = await User.findById(userId);
    if (!user) return false;

    user.wallet += order.finalAmount;

    user.walletTransactions.push({
      orderId: order.orderId,
      amount: Math.round(order.finalAmount),
      date: new Date(),
    });

    await user.save();
    console.log(`Refund processed for user ${userId}: Wallet balance=${user.wallet}, Transaction added:`, user.walletTransactions.slice(-1));
    return true;
  } catch (error) {
    console.error("Error in processRefund:", error);
    return false;
  }
}

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})


const createRazorpay = async (req, res) => {
  try {
      const { amount } = req.body;


      const order = await rzp.orders.create({
          amount: amount * 100,
          currency: "INR",
          receipt: "receipt#1" + Date.now(),
          payment_capture: 1,


      });

      res.json({ success: true, order });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
      console.log("reazorpay error", error)
  }
};

const Razorpaysubscription = async (req, res) => {
  try {
      const { plan_id } = req.body;

      if (!plan_id) {
          return res.status(400).json({ success: false, message: "Plan ID is required" });
      }

      const subscriptionObject = {
          plan_id: plan_id,
          total_count: 60, 
          quantity: 1,
          customer_notify: 1,
          notes: {
              orderType: "Subscription"
          }
      };

      const subscription = await razorpay.subscriptions.create(subscriptionObject);

      res.json({ success: true, subscription });
  } catch (error) {
      res.status(500).json({ success: false, message: error.message });
      console.log("reazorpay error", error)

  }
};


const loadFailure = async (req, res) => {
  try {
    const { orderId, error } = req.query
    res.render('orderfailed', { orderId: orderId || '', error: error || '' })
  } catch (error) {
    console.error("Error occur while loadFailure:", error)
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).redirect('/pageNotFound')
    
  }
}

const submitReview = async (req, res) => {
  try {
    const { orderId, productId, rating, comment } = req.body;
    const userId = req.session.user;
    console.log('submitReview called:', { orderId, productId, rating, comment, userId });

    if (!userId) {
      console.log('No session user');
      return res.status(401).json({ success: false, message: "Please log in to submit a review" });
    }

    if (!orderId || !productId || !rating || !comment) {
      console.log('Missing fields');
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (rating < 1 || rating > 5) {
      console.log('Invalid rating:', rating);
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const order = await Order.findOne({ _id: orderId, userId, status: "Delivered" });
    console.log('Order found:', order);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found or not delivered" });
    }

    const productInOrder = order.orderedItems.some(item => item.product.toString() === productId);
    console.log('Product in order:', productInOrder);
    if (!productInOrder) {
      return res.status(400).json({ success: false, message: "Product not found in this order" });
    }

    const existingReview = await Review.findOne({ userId, productId });
    console.log('Existing review:', existingReview);
    if (existingReview) {
      return res.status(400).json({ success: false, message: "You have already reviewed this product" });
    }

    const review = new Review({
      userId,
      productId,
      rating,
      comment,
      createdAt: new Date(),
    });

    await review.save();
    console.log('Review saved:', review);

    res.json({ success: true, message: "Review submitted successfully" });
  } catch (error) {
    console.error("Error in submitReview:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getOrders,
  loadOrderDetails,
  cancelOrder,
  generateInvoice,
  requestReturn,
  cancelReturnRequest,
  Razorpaysubscription,
  createRazorpay,
  loadFailure,
  submitReview,
};



