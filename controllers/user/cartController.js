const mongoose = require('mongoose');
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");

const getCartPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId).populate({
            path: 'cart.productId',
            model: 'Product',
            populate: { path: 'category', model: 'Category' }
        });

        if (!user) return res.status(404).send('User not found');

        if (typeof user.wallet !== 'number') {
            user.wallet = 0;
        }

        for (let i = user.cart.length - 1; i >= 0; i--) {
            const item = user.cart[i];
            if (item.productId) {
                if (item.productId.quantity === 0) user.cart.splice(i, 1);
                else if (item.quantity > item.productId.quantity) item.quantity = item.productId.quantity;
            }
        }
        await user.save();

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

        const grandTotal = cartItems.reduce((total, item) => total + item.totalPrice, 0);

        res.render("cart", { user, cartItems, grandTotal });
    } catch (error) {
        console.error('Error in getCartPage:', error);
        res.status(500).send('An error occurred while loading the cart');
    }
};

const addToCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user;

        if (!userId || !productId)
            return res.status(400).json({ status: false, message: "Invalid user or product ID" });

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId))
            return res.status(400).json({ status: false, message: "Invalid ID format" });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ status: false, message: "User not found" });

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ status: false, message: "Product not found" });
        if (product.quantity <= 0)
            return res.status(400).json({ status: false, message: "Product is out of stock" });

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

const changeQuantity = async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userId = req.session.user;

        if (!productId || !action)
            return res.status(400).json({ status: false, message: "Product ID and action required" });
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId))
            return res.status(400).json({ status: false, message: "Invalid ID format" });

        const [user, product] = await Promise.all([
            User.findById(userId),
            Product.findById(productId)
        ]);

        if (!user) return res.status(404).json({ status: false, message: "User not found" });
        if (!product) return res.status(404).json({ status: false, message: "Product not found" });

        const cartItemIndex = user.cart.findIndex(item => item.productId?.toString() === productId);
        if (cartItemIndex === -1)
            return res.status(404).json({ status: false, message: "Product not in cart" });

        let newQuantity = user.cart[cartItemIndex].quantity;

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

        user.cart[cartItemIndex].quantity = newQuantity;
        await user.save();

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

const deleteProduct = async (req, res) => {
    try {
        const productId = req.query.id;
        const userId = req.session.user;

        if (!productId)
            return res.status(400).json({ status: false, message: "Product ID required" });
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId))
            return res.status(400).json({ status: false, message: "Invalid ID format" });

        const user = await User.findById(userId).populate('cart.productId');
        if (!user) return res.status(404).json({ status: false, message: "User not found" });

        const cartItemIndex = user.cart.findIndex(item => item.productId?._id.toString() === productId);
        if (cartItemIndex === -1)
            return res.status(404).json({ status: false, message: "Product not in cart" });

        user.cart.splice(cartItemIndex, 1);
        await user.save();

        const grandTotal = calculateGrandTotal(user.cart);

        return res.json({
            status: true,
            message: "Product removed successfully",
            grandTotal: grandTotal
        });
    } catch (error) {
        console.error('Error in deleteProduct:', error);
        res.status(500).json({ status: false, message: "Error removing product" });
    }
};

function calculateGrandTotal(cart) {
    return cart.reduce((total, item) => {
        if (item.productId && item.productId.salePrice) {
            return total + (item.productId.salePrice * item.quantity);
        }
        return total;
    }, 0);
}

const getCheckoutPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId)
            .populate({
                path: 'cart.productId',
                model: 'Product',
                populate: { path: 'category', model: 'Category' }
            });

        if (!user) {
            return res.status(404).send('User not found');
        }

        for (let i = user.cart.length - 1; i >= 0; i--) {
            const item = user.cart[i];
            if (item.productId && (item.productId.quantity === 0 || item.quantity > item.productId.quantity)) {
                if (item.productId.quantity === 0) {
                    user.cart.splice(i, 1);
                } else {
                    item.quantity = item.productId.quantity;
                }
            }
        }
        await user.save();

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

        if (cartItems.length === 0) {
            return res.redirect('/cart');
        }

        const grandTotal = cartItems.reduce((total, item) => total + item.totalPrice, 0);
        const discount = user.appliedCoupon.discountAmount || 0;
        const totalWithDiscount = grandTotal - discount;

        const addressDoc = await Address.findOne({ userId: userId });
        const userAddress = addressDoc ? addressDoc.address : [];
        res.render('checkout', {
            user,
            userAddress,
            cartItems,
            grandTotal,
            discount,
            appliedCoupon: user.appliedCoupon.code || null,
            totalWithDiscount
        });
    } catch (error) {
        console.error('Error in getCheckoutPage:', error);
        res.status(500).send('An error occurred while loading the checkout page');
    }
};

const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user;

        if (!userId || !couponCode) {
            return res.status(400).json({ status: false, message: 'User ID and coupon code are required' });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ status: false, message: 'Invalid user ID format' });
        }

        // Find the coupon
        const coupon = await Coupon.findOne({ name: couponCode.toUpperCase(), isList: true });
        if (!coupon) {
            const exists = await Coupon.findOne({ name: couponCode.toUpperCase() });
            if (exists) {
                return res.status(400).json({ status: false, message: 'Coupon is inactive' });
            }
            return res.status(400).json({ status: false, message: 'Coupon not found' });
        }

        // Check expiration
        if (coupon.expireOn < new Date()) {
            return res.status(400).json({ status: false, message: 'Coupon has expired' });
        }

        // Find the user's cart
        const user = await User.findById(userId).populate({
            path: 'cart.productId',
            populate: { path: 'category', model: 'Category' }
        });
        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }
        if (user.cart.length === 0) {
            return res.status(400).json({ status: false, message: 'Cart is empty' });
        }

        // Check if a coupon is already applied
        if (user.appliedCoupon.couponId) {
            return res.status(400).json({ status: false, message: 'A coupon is already applied. Remove it first.' });
        }

        // Check if coupon has already been used by this user
        if (user.usedCoupons.some(c => c.toString() === coupon._id.toString())) {
            return res.status(400).json({ status: false, message: 'This coupon has already been used.' });
        }

        // Calculate grand total
        const cartItems = user.cart
            .filter(item => item.productId &&
                !item.productId.isBlocked &&
                item.productId.category?.isListed &&
                item.productId.quantity > 0);
        const grandTotal = calculateGrandTotal(cartItems);

        // Check minimum price requirement
        if (grandTotal < coupon.minimumPrice) {
            return res.status(400).json({ status: false, message: `Cart subtotal must be at least ₹${coupon.minimumPrice} to use this coupon` });
        }

        // Calculate discount
        let discountAmount = coupon.offerPrice;
        discountAmount = Math.min(discountAmount, grandTotal); // Cap discount at subtotal

        // Update user with applied coupon details
        user.appliedCoupon = {
            couponId: coupon._id,
            code: coupon.name,
            discountAmount
        };
        await user.save();

        return res.json({
            status: true,
            message: 'Coupon applied successfully',
            breakdown: {
                subtotal: grandTotal,
                discount: discountAmount,
                total: grandTotal - discountAmount,
                couponCode: coupon.name
            }
        });
    } catch (error) {
        console.error('Error in applyCoupon:', { message: error.message, stack: error.stack });
        return res.status(400).json({ status: false, message: `Error applying coupon: ${error.message}` });
    }
};

const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user;

        if (!userId) {
            return res.status(400).json({ status: false, message: 'User ID is required' });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ status: false, message: 'Invalid user ID format' });
        }

        // Find the user's cart
        const user = await User.findById(userId).populate('cart.productId');
        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }

        // Check if a coupon is applied
        if (!user.appliedCoupon.couponId) {
            return res.status(400).json({ status: false, message: 'No coupon is applied' });
        }

        // Calculate grand total
        const cartItems = user.cart
            .filter(item => item.productId &&
                !item.productId.isBlocked &&
                item.productId.category?.isListed &&
                item.productId.quantity > 0);
        const grandTotal = calculateGrandTotal(cartItems);

        // Remove coupon
        user.appliedCoupon = { couponId: null, code: null, discountAmount: 0 };
        await user.save();

        return res.json({
            status: true,
            message: 'Coupon removed successfully',
            breakdown: {
                subtotal: grandTotal,
                discount: 0,
                total: grandTotal,
                couponCode: null
            }
        });
    } catch (error) {
        console.error('Error in removeCoupon:', { message: error.message, stack: error.stack });
        return res.status(400).json({ status: false, message: `Error removing coupon: ${error.message}` });
    }
};

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const { selectedAddress, paymentMethod, grandTotal, totalAmountInput } = req.body;

        if (!selectedAddress || !paymentMethod || !grandTotal || !totalAmountInput) {
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
                productName: item.productId.productName,
                product: item.productId._id,
                quantity: item.quantity,
                price: item.productId.salePrice,
                Image: item.productId.productImage[0],
            }));

        if (cartItems.length === 0) {
            return res.status(400).json({ status: false, message: 'Cart is empty' });
        }

        const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
        const shippingCost = 50;
        const discount = user.appliedCoupon.discountAmount || 0;
        const finalAmount = subtotal + shippingCost - discount;

      

        // Remove the grandTotal validation since we're now using totalAmountInput
        // which includes shipping and discounts
        if (Math.abs(parseFloat(totalAmountInput) - finalAmount) > 1) { 
            console.log('Total amount mismatch:', { 
                frontendTotal: parseFloat(totalAmountInput), 
                backendTotal: finalAmount 
            });
            return res.status(400).json({ 
                status: false, 
                message: 'Total amount mismatch. Please refresh and try again.' 
            });
        }

        const orders = [];
        for (const item of cartItems) {
            const order = new Order({
                userId,
                orderedItems: [item],
                totalPrice: item.price * item.quantity,
                subtotal: item.price * item.quantity,
                discount: discount / cartItems.length,
                shipping: shippingCost / cartItems.length,
                finalAmount: (item.price * item.quantity) + 
                             (shippingCost / cartItems.length) - 
                             (discount / cartItems.length),
                address: {
                    addressType: address.addressType,
                    name: address.name,
                    city: address.city,
                    landMark: address.landMark,
                    state: address.state,
                    pincode: address.pincode,
                    phone: address.phone,
                    altPhone: address.altPhone,
                },
                paymentMethod,
                status: 'Pending',
                createdOn: new Date(),
            });

            await Product.findByIdAndUpdate(
                item.product,
                { $inc: { quantity: -item.quantity } }
            );

            await order.save();
            orders.push(order);
        }

        // Mark coupon as used if applied
        if (user.appliedCoupon.couponId) {
            user.usedCoupons.push(user.appliedCoupon.couponId);
        }

        user.orderHistory.push(...orders.map(order => order._id));
        user.cart = [];
        user.appliedCoupon = { couponId: null, code: null, discountAmount: 0 };
        await user.save();

        console.log('Orders saved successfully:', orders.map(o => o._id));

        return res.json({
            status: true,
            message: 'Orders placed successfully',
            redirect: `/order-success/${orders[0]._id}`,
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
    applyCoupon,
    removeCoupon,
    placeOrder,
    getOrderSuccess,
};



