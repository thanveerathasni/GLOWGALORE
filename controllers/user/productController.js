const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Review = require("../../models/reviewSchema");

const productDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');
        if (!product) {
            return res.redirect("/pageNotFound");
        }
        const findCategory = product.category;

        // Calculate max offer and salePrice for the current product
        const productOffer = product.productOffer || 0;
        const categoryOffer = findCategory?.categoryOffer || 0;
        const maxOffer = Math.max(productOffer, categoryOffer);
        const salePrice = product.regularPrice * (1 - maxOffer / 100);

        // Fetch related products (same category, exclude current product, in-stock, limit 4)
        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: productId },
            quantity: { $gt: 0 }
        })
            .populate('category')
            .limit(4);

        // Calculate maxOffer and salePrice for each related product
        const relatedProductsWithOffers = relatedProducts.map(p => {
            const pOffer = p.productOffer || 0;
            const cOffer = p.category?.categoryOffer || 0;
            const maxOffer = Math.max(pOffer, cOffer);
            const salePrice = p.salePrice * (1 - maxOffer / 100);
            return { ...p._doc, maxOffer, salePrice };
        });

        // Fetch reviews for the product
    const reviews = await Review.find({ productId })
    .populate("userId", "name")
    .sort({ createdAt: -1 });

  // Calculate average rating
  const averageRating = reviews.length
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : 0;

        res.render("product-detail", {
            user: userData,
            product: { ...product._doc, salePrice, maxOffer },
            quantity: product.quantity,
            category: findCategory,
            relatedProducts: relatedProductsWithOffers,
            reviews,
            averageRating,
        });
    } catch (error) {
        console.log(error, "error in fetching product details");
        res.redirect("/pageNotFound");
    }
};

module.exports = {
    productDetails,
};