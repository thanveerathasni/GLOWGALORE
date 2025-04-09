const mongoose = require('mongoose');
const Cart = require("../../models/cartSchema"); // Not used in this file
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema")
const Order = require("../../models/orderSchema")
// Load cart page for user
const getCartPage = async (req, res) => {
    try {
        const userId = req.session.user;
        // Fetch user with populated cart products and categories
        const user = await User.findById(userId).populate({
            path: 'cart.productId',
            model: 'Product',
            populate: { path: 'category', model: 'Category' }
        });

        if (!user) return res.status(404).send('User not found');

        if (typeof user.wallet !== 'number') {
            user.wallet = 0; // Set default value if it's not a number
          }

        // Remove or adjust cart items based on stock
        for (let i = user.cart.length - 1; i >= 0; i--) {
            const item = user.cart[i];
            if (item.productId) {
                if (item.productId.quantity === 0) user.cart.splice(i, 1); // Remove if out of stock
                else if (item.quantity > item.productId.quantity) item.quantity = item.productId.quantity; // Cap at stock
            }
        }
        await user.save();

        // Filter valid cart items and format for frontend
        const cartItems = user.cart
            .filter(item => item.productId && 
                !item.productId.isBlocked && 
                item.productId.category?.isListed && 
                item.productId.quantity > 0)
            .map(item => ({
                product: item.productId,
                quantity: item.quantity,
                totalPrice: item.productId.salePrice * item.quantity
            }));

        // Calculate total cart value
        const grandTotal = cartItems.reduce((total, item) => total + item.totalPrice, 0);

        // Render cart page
        res.render("cart", { user, cartItems, grandTotal });
    } catch (error) {
        console.error('Error in getCartPage:', error);
        res.status(500).send('An error occurred while loading the cart');
    }
};

// Add product to user's cart
const addToCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user;

        // Check for required inputs
        if (!userId || !productId) 
            return res.status(400).json({ status: false, message: "Invalid user or product ID" });

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) 
            return res.status(400).json({ status: false, message: "Invalid ID format" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ status: false, message: "User not found" });

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ status: false, message: "Product not found" });
        if (product.quantity <= 0) 
            return res.status(400).json({ status: false, message: "Product is out of stock" });

        // Update or add cart item
        const cartItemIndex = user.cart.findIndex(item => item.productId.toString() === productId);
        let newQuantity;
        if (cartItemIndex > -1) {
            const currentQuantity = user.cart[cartItemIndex].quantity;
            if (currentQuantity >= 5) 
                return res.status(400).json({ status: false, message: "Max 5 items allowed", quantity: currentQuantity });
            if (currentQuantity >= product.quantity) 
                return res.status(400).json({ status: false, message: "Stock limit reached", quantity: currentQuantity });
            user.cart[cartItemIndex].quantity += 1;
            newQuantity = user.cart[cartItemIndex].quantity;
        } else {
            user.cart.push({ productId: productId, quantity: 1 });
            newQuantity = 1;
        }

        await user.save();
        return res.json({ 
            status: true, 
            message: "Product added to cart", 
            quantity: newQuantity, 
            cartLength: user.cart.length 
        });
    } catch (error) {
        console.error('Error in addToCart:', { message: error.message, stack: error.stack });
        return res.status(500).json({ status: false, message: "Error adding to cart" });
    }
};

// Update cart item quantity
const changeQuantity = async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userId = req.session.user;

        // Validate inputs
        if (!productId || !action) 
            return res.status(400).json({ status: false, message: "Product ID and action required" });
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) 
            return res.status(400).json({ status: false, message: "Invalid ID format" });

        // Fetch user and product concurrently
        const [user, product] = await Promise.all([
            User.findById(userId),
            Product.findById(productId)
        ]);

        if (!user) return res.status(404).json({ status: false, message: "User not found" });
        if (!product) return res.status(404).json({ status: false, message: "Product not found" });

        // Find cart item
        const cartItemIndex = user.cart.findIndex(item => item.productId?.toString() === productId);
        if (cartItemIndex === -1) 
            return res.status(404).json({ status: false, message: "Product not in cart" });

        let newQuantity = user.cart[cartItemIndex].quantity;

        // Handle out-of-stock case
        if (product.quantity === 0) {
            user.cart.splice(cartItemIndex, 1);
            await user.save();
            const updatedUser = await User.findById(userId).populate('cart.productId');
            return res.json({
                status: true,
                message: "Product removed due to zero stock",
                grandTotal: calculateGrandTotal(updatedUser.cart)
            });
        }

        // Update quantity based on action
        if (action === "increase") {
            if (newQuantity >= 5) 
                return res.status(400).json({ status: false, message: "Max 5 items allowed" });
            if (newQuantity >= product.quantity) 
                return res.status(400).json({ status: false, message: "Insufficient stock" });
            newQuantity += 1;
        } else if (action === "decrease") {
            if (newQuantity <= 1) {
                user.cart.splice(cartItemIndex, 1);
                await user.save();
                const updatedUser = await User.findById(userId).populate('cart.productId');
                return res.json({
                    status: true,
                    message: "Product removed from cart",
                    grandTotal: calculateGrandTotal(updatedUser.cart)
                });
            }
            newQuantity -= 1;
        } else {
            return res.status(400).json({ status: false, message: "Invalid action" });
        }

        // Save updated quantity
        user.cart[cartItemIndex].quantity = newQuantity;
        await user.save();

        // Calculate new total
        const updatedUser = await User.findById(userId).populate('cart.productId');
        const grandTotal = calculateGrandTotal(updatedUser.cart);

        return res.json({
            status: true,
            message: "Cart updated successfully",
            grandTotal: grandTotal,
            quantity: newQuantity
        });
    } catch (error) {
        console.error('Error in changeQuantity:', error);
        return res.status(500).json({ status: false, message: "Error updating cart" });
    }
};

// Remove product from cart
const deleteProduct = async (req, res) => {
    try {
        const productId = req.query.id;
        const userId = req.session.user;

        // Validate input
        if (!productId) 
            return res.status(400).json({ status: false, message: "Product ID required" });
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) 
            return res.status(400).json({ status: false, message: "Invalid ID format" });

        // Fetch user with populated cart
        const user = await User.findById(userId).populate('cart.productId');
        if (!user) return res.status(404).json({ status: false, message: "User not found" });

        // Find and remove cart item
        const cartItemIndex = user.cart.findIndex(item => item.productId?._id.toString() === productId);
        if (cartItemIndex === -1) 
            return res.status(404).json({ status: false, message: "Product not in cart" });

        user.cart.splice(cartItemIndex, 1);
        await user.save();

        // Calculate new total
        const grandTotal = calculateGrandTotal(user.cart);

        return res.json({
            status: true,
            message: "Product removed successfully",
            grandTotal: grandTotal
        });
    } catch (error) {
        console.error('Error in deleteProduct:', error);
        return res.status(500).json({ status: false, message: "Error removing product" });
    }
};

// Calculate total cart value
function calculateGrandTotal(cart) {
    return cart.reduce((total, item) => {
        if (item.productId && item.productId.salePrice) {
            return total + (item.productId.salePrice * item.quantity);
        }
        return total;
    }, 0);
}

// Get Checkout Page
const getCheckoutPage = async (req, res) => {
  try {
      const userId = req.session.user;

      // Fetch user with populated cart products, categories, and addresses
      const user = await User.findById(userId)
          .populate({
              path: 'cart.productId',
              model: 'Product',
              populate: { path: 'category', model: 'Category' }
          });

      if (!user) {
          return res.status(404).send('User not found');
      }

      // Adjust cart based on current product stock, removing zero-quantity items
      for (let i = user.cart.length - 1; i >= 0; i--) {
          const item = user.cart[i];
          if (item.productId && (item.productId.quantity === 0 || item.quantity > item.productId.quantity)) {
              if (item.productId.quantity === 0) {
                  user.cart.splice(i, 1); // Remove if stock is 0
              } else {
                  item.quantity = item.productId.quantity; // Adjust to available stock
              }
          }
      }
      await user.save();

      // Filter valid cart items and format for frontend
      const cartItems = user.cart
          .filter(item => 
              item.productId && 
              !item.productId.isBlocked && 
              item.productId.category?.isListed && 
              item.productId.quantity > 0
          )
          .map(item => ({
              product: item.productId,
              quantity: item.quantity,
              totalPrice: item.productId.salePrice * item.quantity
          }));

      // Redirect to cart if no items
      if (cartItems.length === 0) {
          return res.redirect('/cart');
      }

      // Calculate total cart value
      const grandTotal = cartItems.reduce((total, item) => total + item.totalPrice, 0);

      // Get user addresses (assuming addresses are stored in user.address array)
      const addressDoc = await Address.findOne({ userId: userId });
      const userAddress = addressDoc ? addressDoc.address : [];
      // Render checkout page with addresses
      res.render('checkout', {
          user,
          userAddress,
          cartItems,
          grandTotal,
          
      });
  } catch (error) {
      console.error('Error in getCheckoutPage:', error);
      res.status(500).send('An error occurred while loading the checkout page');
  }
};

const placeOrder = async (req, res) => {
  try {
      console.log('placeOrder called with:', req.body);
      const userId = req.session.user;
      const { selectedAddress, paymentMethod, grandTotal } = req.body;

      if (!selectedAddress || !paymentMethod || !grandTotal) {
          console.log('Missing fields:', { selectedAddress, paymentMethod, grandTotal });
          return res.status(400).json({ status: false, message: 'Missing required fields' });
      }

      const user = await User.findById(userId).populate('cart.productId');
      if (!user) {
          console.log('User not found for ID:', userId);
          return res.status(404).json({ status: false, message: 'User not found' });
      }

      const addressDoc = await Address.findOne({ userId });
      if (!addressDoc) {
          console.log('Address not found for user:', userId);
          return res.status(404).json({ status: false, message: 'Address not found' });
      }

      const address = addressDoc.address.find(addr => addr._id.toString() === selectedAddress);
      if (!address) {
          console.log('Selected address not found:', selectedAddress);
          return res.status(404).json({ status: false, message: 'Selected address not found' });
      }

      const cartItems = user.cart
          .filter(item => item.productId && item.productId.quantity > 0)
          .map(item => ({
            productName:item.productId.productName,
              product: item.productId._id,
              quantity: item.quantity,
              price: item.productId.salePrice,
              Image: item.productId. productImage[0],
          }));

      if (cartItems.length === 0) {
          console.log('Cart is empty for user:', userId);
          return res.status(400).json({ status: false, message: 'Cart is empty' });
      }

      const totalPrice = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
      const shippingCost = 50;
      const discount = 0;
      const finalAmount = totalPrice + shippingCost - discount;

      console.log('Order details:', { totalPrice, finalAmount, cartItems });

      if (parseFloat(grandTotal) !== totalPrice) {
          console.log('Grand total mismatch:', { grandTotal, totalPrice });
          return res.status(400).json({ status: false, message: 'Grand total mismatch' });
      }

      const order = new Order({
          userId,
          orderedItems: cartItems,
          totalPrice,
          discount,
          finalAmount,
          address: {
              addressType: address.addressType,
              name: address.name,
              city: address.city,
              landMark: address.landMark,
              state: address.state,
              pincode: address.pincode,
              phone: address.phone,
              altPhone: address.altPhone
          },
          paymentMethod,
          status: 'Pending',
          createdOn: new Date()
      });

      console.log('Order object before save:', order);
      await order.save();
      console.log('Order saved successfully:', order._id);

      user.cart = [];
      await user.save();
      console.log('User cart cleared');
      return res.json({
          status: true,
          message: 'Order placed successfully',
          redirect: `/order-success/${order._id}`     
         });
  } catch (error) {
      console.error('Error in placeOrder:', error);
      return res.status(500).json({ status: false, message: 'Error placing order' });
  }
};

const getOrderSuccess = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      const order = await Order.findById(orderId).lean();
      if (!order) {
        return res.status(404).send('Order not found');
      }
      res.render('order-successful', { order });
    } catch (error) {
      console.error('Error in getOrderSuccess:', error);
      res.status(500).send('Server error');
    }
  };
  
  module.exports = {
    getCartPage,
    addToCart,
    changeQuantity,
    deleteProduct,
    getCheckoutPage,
    placeOrder,
    getOrderSuccess,
  };

