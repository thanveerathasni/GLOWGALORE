const Offer = require('../../models/offerSchema');
const Product = require('../../models/productSchema');
const Category = require("../../models/categorySchema");

const getAllOffers = async (req, res) => {
    try {
        const { search = '', page = 1 } = req.query;
        const limit = 10; // Offers per page
        const searchRegex = new RegExp(search, 'i');

        // Fetch products and categories for form
        const products = await Product.find();
        const categories = await Category.find();

        // Product offers
        const productQuery = {
            offerType: 'product',
            $or: [
                { 'product.name': searchRegex },
                { title: searchRegex }
            ]
        };
        const productCount = await Offer.countDocuments(productQuery);
        const productTotalPages = Math.ceil(productCount / limit);
        const productCurrentPage = parseInt(page) || 1;
        const productOffers = await Offer.find(productQuery)
            .populate('product')
            .skip((productCurrentPage - 1) * limit)
            .limit(limit);

        // Category offers
        const categoryQuery = {
            offerType: 'category',
            $or: [
                { 'category.name': searchRegex },
                { title: searchRegex }
            ]
        };
        const categoryCount = await Offer.countDocuments(categoryQuery);
        const categoryTotalPages = Math.ceil(categoryCount / limit);
        const categoryCurrentPage = parseInt(page) || 1;
        const categoryOffers = await Offer.find(categoryQuery)
            .populate('category')
            .skip((categoryCurrentPage - 1) * limit)
            .limit(limit);

        res.render('offer-list', {
            products,
            categories,
            productOffers,
            categoryOffers,
            productCurrentPage,
            productTotalPages,
            categoryCurrentPage,
            categoryTotalPages,
            search
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
};

const addOffer = async (req, res) => {
    try {
        const { title, description, discount, startDate, endDate, offerType, product, category } = req.body;
        const offer = new Offer({
            title,
            description,
            discount,
            startDate,
            endDate,
            offerType,
            product: offerType === 'product' ? product : undefined,
            category: offerType === 'category' ? category : undefined
        });
        await offer.save();
        res.json({ status: true, message: 'Offer added successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add offer' });
    }
};

module.exports = {
    addOffer,
    getAllOffers
};