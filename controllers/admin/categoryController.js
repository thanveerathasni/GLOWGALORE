const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");

// Function to fetch and display category information with pagination and search functionality
const categoryInfo = async (req, res) => {
    try {
        // trim, Build query to search categories 
        let search = req.query.search ? req.query.search.trim() : '';

        const query = {
            name: { $regex: ".*" + search + ".*", $options: 'i' }
        };

        // Pagination logic: calculate the current page, limit, and skip
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        // Fetch category data from the database with pagination
        const categoryData = await Category.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);


        // Calculate the total number of categories matching the query
        const totalCategories = await Category.countDocuments(query);
        const totalPages = Math.ceil(totalCategories / limit);

        // Render the categories page with the data and pagination details
        res.render("category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });
    } catch (error) {
        console.error(error);
        res.redirect("/pageError");
    }
};

// Function to add a new category
const addCategory = async (req, res) => {
    const { name, description } = req.body;

    try {
        // Check if a category with the same name already exists (case-insensitive)
        const existingCategory = await Category.findOne({ name: { $regex: '^' + name + '$', $options: 'i' } });
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists" });
        }

        // Create a new category and save it to the database
        const newCategory = new Category({
            name,
            description,
        });

        await newCategory.save();
        return res.json({ message: "Category added successfully" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Function to add an offer to a category
const addCategoryOffer = async (req, res) => {
    try {
        // Get the offer percentage and category ID from the request
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;

        // Find the category by ID
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        // Find products in the category
        const products = await Product.find({ category: category._id });

        // Apply the category offer to all products in the category
        for (const product of products) {
            // Calculate maxOffer considering the new category offer and existing product offer
            const maxOffer = Math.max(product.productOffer || 0, percentage);
            // Update salePrice based on maxOffer
            product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (maxOffer / 100));
            await product.save();
        }

        // Set the category offer
        category.categoryOffer = percentage;
        await category.save();

        res.json({ status: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};

// Function to remove the category offer
const removeCategoryOffer = async (req, res) => {
    try {
        // Get the category ID from the request
        const categoryId = req.body.categoryId;

        // Find the category by ID
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        // Get the category offer percentage
        const percentage = category.categoryOffer;

        // Find all products in the category
        const products = await Product.find({ category: category._id });

        if (products.length > 0) {
            // Recalculate sale price for each product based on remaining productOffer
            for (const product of products) {
                const maxOffer = product.productOffer || 0; // Use productOffer after removing categoryOffer
                product.salePrice = product.regularPrice - Math.floor(product.regularPrice * (maxOffer / 100));
                await product.save();
            }
        }

        // Reset the category offer to 0
        category.categoryOffer = 0;
        await category.save();
        res.json({ status: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Internal server error" });
    }
};

// Function to unlist a category
const listedCategory = async (req, res) => {
    try {
        let id = req.query.id;
        // Update the category to be unlisted
        await Category.updateOne({ _id: id }, { $set: { isListed: false } });
        res.redirect("/admin/category");
    } catch (error) {
        console.error(error);
        res.redirect("/pageError");
    }
};

// Function to list a category again
const unlistedCategory = async (req, res) => {
    try {
        let id = req.query.id;
        // Update the category to be listed again
        await Category.updateOne({ _id: id }, { $set: { isListed: true } });
        res.redirect("/admin/category");
    } catch (error) {
        console.error(error);
        res.redirect("/pageError");
    }
};

// Function to render the edit category page
const editCategory = async (req, res) => {
    try {
        const id = req.query.id;
        // Find the category by ID
        const category = await Category.findOne({ _id: id });
        res.render("edit-category", { category: category });
    } catch (error) {
        res.redirect("/pageError");
    }
};

// Function to handle updating the category after editing
const posteditCategory = async (req, res) => {
    try {
        const id = req.params.id;
        const { categoryName, description } = req.body;

        // Check if the updated category name already exists (case-insensitive, excluding current category)
        const existingCategory = await Category.findOne({ 
            name: { $regex: '^' + categoryName + '$', $options: 'i' },
            _id: { $ne: id }
        });
        if (existingCategory) {
            return res.status(400).json({ error: "Category exists, please choose another name" });
        }

        // Update the category with the new name and description
        const updateCategory = await Category.findByIdAndUpdate(id, {
            name: categoryName,
            description: description,
        }, { new: true });

        if (updateCategory) {
            res.redirect("/admin/category");
        } else {
            res.status(404).json({ error: "Category not found" });
        }
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    listedCategory,
    unlistedCategory,
    editCategory,
    posteditCategory,
};


