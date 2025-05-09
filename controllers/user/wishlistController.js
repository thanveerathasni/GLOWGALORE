



const mongoose = require('mongoose');
const Wishlist = require('../../models/wishlistSchema');
const User = require('../../models/userSchema');
const Product = require('../../models/productSchema');

const getWishlistPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const wishlist = await Wishlist.findOne({ userId }).populate('products');
    const wishlistItems = wishlist ? wishlist.products : [];
    res.render('wishlist', { wishlist: wishlistItems });
  } catch (error) {
    console.error('Error loading wishlist:', error);
    res.status(500).send('Server error');
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;
console.log("req.body",req.body)




    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ status: false, message: 'Invalid product ID' });
    }

    const product = await Product.findById(productId);
    if (!product || product.isBlocked || product.quantity <= 0) {
      return res.status(400).json({ status: false, message: 'Product unavailable' });
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [productId] });
    } else {
      if (!wishlist.products.includes(productId)) {
        wishlist.products.push(productId);
      }
    }

    await wishlist.save();
    res.json({ status: true, message: 'Added to wishlist' });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

const addToCartFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ status: false, message: 'Invalid product ID' });
    }

    const user = await User.findById(userId);
    const wishlist = await Wishlist.findOne({ userId }).populate('products');
    if (!wishlist || !wishlist.products.length) {
      return res.status(400).json({ status: false, message: 'Wishlist is empty' });
    }

    const product = wishlist.products.find(p => p._id.toString() === productId);
    if (!product) {
      return res.status(404).json({ status: false, message: 'Product not in wishlist' });
    }

    const cartItemIndex = user.cart.findIndex(item => item.productId.toString() === productId);
    if (cartItemIndex > -1) {
      if (user.cart[cartItemIndex].quantity < 5 && user.cart[cartItemIndex].quantity < product.quantity) {
        user.cart[cartItemIndex].quantity += 1;
      }
    } else {
      user.cart.push({ productId, quantity: 1 });
    }

    wishlist.products = wishlist.products.filter(p => p._id.toString() !== productId);

    await Promise.all([user.save(), wishlist.save()]);
    res.json({ status: true, message: 'Moved to cart' });
  } catch (error) {
    console.error('Error moving to cart:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.session.user;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ status: false, message: 'Invalid product ID' });
    }

    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist || !wishlist.products.length) {
      return res.status(400).json({ status: false, message: 'Wishlist is empty' });
    }

    const productExists = wishlist.products.find(p => p.toString() === productId);
    if (!productExists) {
      return res.status(404).json({ status: false, message: 'Product not in wishlist' });
    }

    wishlist.products = wishlist.products.filter(p => p.toString() !== productId);
    await wishlist.save();

    res.json({ status: true, message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

module.exports = {
  getWishlistPage,
  addToWishlist,
  addToCartFromWishlist,
  removeFromWishlist
};