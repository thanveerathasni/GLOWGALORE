const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Razorpay = require("razorpay");
const Wallet = require("../../models/walletSchema");
const { v4: uuidv4 } = require("uuid");



const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();

    const orders = await Order.find()
      .populate("userId") // Populate user schema for  wallet array
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);

    res.render("admin-orders", {
      orders: orders.map(order => ({
        ...order._doc,
        user: order.userId, // Pass user data with wallet array
      })),
      title: "Order Management",
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      limit,
    });

  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId);
    console.log(order)

    if (!order) {
      return res.status(404).send("order not found");
    }
    res.render("admin-order-details", { order });
  } catch (error) {
    console.log("server error in fetching order detailpage", error);
    res.redirect("/pageNotFound");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Cannot update Cancelled order" });
    }

    order.status = status;
    order.orderedItems[0].status = status;

    order.updatedOn = new Date();

    if (status === "Delivered") {
      order.deliveredOn = new Date();
    }

    await order.save();
    res.json({ success: true, message: "Order status updated successfully" });
  } catch (error) {
    console.log("error while updating orders", error);
    res.redirect("/pageNotFound");
  }
};


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || rzp_test_TvZQJb8vKDsWxJ,
  key_secret: process.env.RAZORPAY_KEY_SECRET || qctXsWfZ8XuE10RIn63F6wKW,
});


const processRefund = async (userId, order) => {
  try {
    const user = await User.findById(userId);
    if (!user) return false;

    user.wallet += order.finalAmount;

    // Record transaction in user.walletTransactions
    user.walletTransactions.push({
      orderId: order.orderId,
      amount: refundAmount,
      date: new Date(),
      reason: reason, 
    });

    await user.save();
    console.log(`Refund processed for user ${userId}: Wallet balance=${user.wallet}, Transaction added:`, user.walletTransactions.slice(-1));
    return true;
  } catch (error) {
    console.error("Error in processRefund:", error);
    return false;
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate("userId");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "Cancelled" && order.status !== "Delivered") {
      order.status = "Cancelled";
      order.orderedItems[0].status = "Cancelled";

      order.updatedOn = new Date();

      await Product.findByIdAndUpdate(order.orderedItems[0].product, {
        $inc: { quantity: order.orderedItems[0].quantity },
      });

      if (order.paymentMethod === "razorpay" || order.paymentMethod === "wallet") {
        const refundSuccess = await processRefund(order.userId, order);
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

    }
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}





  // const cancelOrder = async (req, res) => {
  //   try {
  //     const { orderId } = req.body;
  //     const order = await Order.findById(orderId).populate("userId");

  //     if (!order) {
  //       return res.status(404).json({ success: false, message: "Order not found" });
  //     }

  //     if (order.status !== "Cancelled" && order.status !== "Delivered") {
  //       order.status = "Cancelled";
  //       order.orderedItems[0].status = "Cancelled";

  //       order.updatedOn = new Date();

  //       await Product.findByIdAndUpdate(order.orderedItems[0].product, {
  //         $inc: { quantity: order.orderedItems[0].quantity },
  //       });

  //       if (order.paymentMethod === "razorpay" || order.paymentMethod === "wallet") {
  //         const refundSuccess = await processRefund(order.userId, order);
  //         if (!refundSuccess) {
  //           return res.status(500).json({
  //             success: false,
  //             message: "Failed to process refund",
  //           });
  //         }
  //         const user = order.userId;
  //               user.wallet += Math.round(order.finalAmount)
  ; // Add refund amount to wallet balance
  //         await user.save();
  //       } else if (order.paymentMethod === "cod") {
  //         const user = order.userId;
  //               user.wallet += Math.round(order.finalAmount)
  ; // Add refund amount to wallet balance for COD
  //         await user.save();
  //       }

  //       await order.save();
  //       res.json({ success: true, message: "Order Cancelled and refund processed successfully" });
  //     } else {
  //       res.status(400).json({ success: false, message: "Order cannot be Cancelled" });
  //     }
  //   } catch (error) {
  //     console.error("Error cancelling order:", error);
  //     res.status(500).json({ success: false, message: "Internal server error" });
  //   }
  // };

  const handleReturnRequest = async (req, res) => {
    try {
      const { orderId, action, message, category } = req.body;


      if (!orderId || !action) {
        return res.status(400).json({
          success: false,
          message: "Order ID and action are required",
        });
      }



      const order = await Order.findById(orderId).populate('userId')
      const user = await User.findById(order.userId)
      const product = order?.orderedItems?.[0]?.product; 
      const retquantity = order?.orderedItems?.[0]?.quantity;



      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (order.status !== "Return Request" || !["Pending"].includes(order.requestStatus)) {
        return res.status(400).json({
          success: false,
          message: "Order is not in a return request state or already processed",
        });
      }

      if (action === "approve") {
        order.status = "Returned";
        user.wallet += Math.round(order.finalAmount)
        order.requestStatus = "approved";

        await Product.findByIdAndUpdate(
          product,
          { $inc: { quantity: retquantity } },

        );


      } else if (action === "reject") {
        if (!message || !category) {
          return res.status(400).json({
            success: false,
            message: "Rejection reason and category are required",
          });
        }
        order.status = "Delivered";
        order.requestStatus = "rejected";
        order.returnReason = category;
        order.returnDescription = message;
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid action. Use 'approve' or 'reject'",
        });
      }


      order.updatedOn = new Date();
      await order.save();
      await user.save();


      res.json({
        success: true,
        message: `Return request ${action}d successfully`,
      });
    } catch (error) {
      console.error("Error handling return request:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  const updateReturnStatus = async (req, res) => {
    try {
      const { orderId, status } = req.body;
      const order = await Order.findById(orderId).populate("userId");

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (order.status !== "returning" && status === "Returned") {
        return res.status(400).json({
          success: false,
          message: "Order must be in returning status first",
        });
      }

      order.status = status;
      order.updatedOn = new Date();

      if (status === "Returned") {
        if (order.paymentMethod === "razorpay" || order.paymentMethod === "wallet") {
          const refundSuccess = await processRefund(order.userId, order);
          if (!refundSuccess) {
            return res.status(500).json({
              success: false,
              message: "Failed to process refund",
            });
          }
          const user = order.userId;
          user.wallet.push(order.finalAmount); // Push refund amount to wallet array
          await user.save();
        } else if (order.paymentMethod === "cod") {
          const user = order.userId;
          user.wallet.push(order.finalAmount); // Push refund amount to wallet array for COD
          await user.save().catch(err => console.error("Failed to save user:", err));
        }
      }

      await order.save();
      res.json({
        success: true,
        message: "Return status updated successfully",
      });
    } catch (error) {
      console.error("Error updating return status:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  module.exports = {
    getOrders,
    getOrderDetails,
    updateOrderStatus,
    cancelOrder,
    updateReturnStatus,
    handleReturnRequest,
  };