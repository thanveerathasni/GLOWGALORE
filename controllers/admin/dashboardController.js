const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");

const getAdminDashboard = async (req, res) => {
    try {
    
        // Sales Data (Monthly, Quarterly, Yearly)
        const salesData = {
            monthly: await Order.aggregate([
                { $match: { status: 'Delivered' } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m', date: '$createdOn' } },
                        revenue: { $sum: '$finalAmount' }
                    }
                },
                { $sort: { _id: 1 } },
                { $limit: 12 }
            ]),
            quarterly: await Order.aggregate([
                { $match: { status: 'Delivered' } },
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdOn' },
                            quarter: { $ceil: { $divide: [{ $month: '$createdOn' }, 3] } }
                        },
                        revenue: { $sum: '$finalAmount' }
                    }
                },
                {
                    $project: {
                        _id: { $concat: ['Q', { $toString: '$_id.quarter' }, '-', { $toString: '$_id.year' }] },
                        revenue: 1
                    }
                },
                { $sort: { _id: 1 } },
                { $limit: 4 }
            ]),
            yearly: await Order.aggregate([
                { $match: { status: 'Delivered' } },
                {
                    $group: {
                        _id: { $year: '$createdOn' },
                        revenue: { $sum: '$finalAmount' }
                    }
                },
                { $sort: { _id: 1 } },
                { $limit: 3 }
            ])
        };
      

        // Top 10 Products by Quantity Sold
        const topProducts = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $unwind: '$orderedItems' },
            {
                $group: {
                    _id: '$orderedItems.product',
                    totalSales: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } },
                    totalQuantity: { $sum: '$orderedItems.quantity' }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    name: { $ifNull: ['$product.productName', 'Unknown Product'] },
                    sales: '$totalSales',
                    quantity: '$totalQuantity'
                }
            },
            { $sort: { quantity: -1 } }, 
            { $limit: 10 }
        ]);
     

        // Top 10 Categories by Quantity Sold
        const topCategories = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$category._id',
                    name: { $first: { $ifNull: ['$category.name', 'Unknown Category'] } },
                    totalSales: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } },
                    totalQuantity: { $sum: '$orderedItems.quantity' }
                }
            },
            {
                $project: {
                    name: 1,
                    sales: '$totalSales',
                    quantity: '$totalQuantity'
                }
            },
            { $sort: { quantity: -1 } }, 
            { $limit: 10 }
        ]);

        // Top 10 Brands by Quantity Sold
        const topBrands = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$product.brand',
                    name: { $first: { $ifNull: ['$product.brand', 'Unknown Brand'] } },
                    totalSales: { $sum: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] } },
                    totalQuantity: { $sum: '$orderedItems.quantity' }
                }
            },
            {
                $project: {
                    name: 1,
                    sales: '$totalSales',
                    quantity: '$totalQuantity'
                }
            },
            { $sort: { quantity: -1 } }, 
            { $limit: 10 }
        ]);

        res.render("admin-dashboard", {
            salesData,
            topProducts,
            topCategories,
            topBrands
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.redirect('/admin/pageError');
    }
};

const getLedgerData = async (req, res) => {
    try {
        const orders = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $unwind: '$orderedItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderedItems.product',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.category',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdOn' } },
                    product: { $ifNull: ['$product.productName', 'Unknown Product'] },
                    category: { $ifNull: ['$category.name', 'Unknown Category'] },
                    brand: { $ifNull: ['$product.brand', 'Unknown Brand'] },
                    amount: { $multiply: ['$orderedItems.quantity', '$orderedItems.price'] }
                }
            },
            { $limit: 100 }
        ]);
     
        res.json({ status: true, data: orders });
    } catch (error) {
        console.error('Error fetching ledger data:', error);
        res.status(500).json({ status: false, message: 'Internal server error' });
    }
};

module.exports = {
    getAdminDashboard,
    getLedgerData
};