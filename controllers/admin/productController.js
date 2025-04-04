const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Brand = require("../../models/brandSchema")
const User = require("../../models/userSchema")
const fs = require("fs")
const path = require("path")
const sharp = require("sharp")
const { area120tables } = require("googleapis/build/src/apis/area120tables")

// Get the page for adding a product
const getProductAddPage = async (req, res) => {
    try {
        // Fetch categories and brands for the add product page
        const category = await Category.find({isListed:true})
        const brand = await Brand.find({isBlocked:false})
        res.render("product-add", {
            cat: category,
            brand: brand
        })
    } catch (error) {
        res.redirect("/pageError")
    }
}

// Function to add new products
const addProducts = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Uploaded Files:', req.files);

        // Check if files are uploaded, otherwise return an error
        if (!req.files || req.files.length === 0) {
            console.error('No files uploaded');
            return res.status(400).json({ error: 'At least one product image is required' });
        }

        const products = req.body;

        // Check if the product already exists
        const productExists = await Product.findOne({ productName: products.productName });
        if (productExists) {
            req.files.forEach(file => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            });
            return res.status(400).json({ error: 'Product already exists, please try with another name' });
        }

        // Directory to save product images
        const uploadDir = path.join(__dirname, '../../public/uploads/product-images');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Array to store resized image filenames
        const images = [];
        for (let i = 0; i < req.files.length; i++) {
            try {
                const originalImagePath = req.files[i].path;
                const filename = req.files[i].filename;
                const resizedFilename = `resized-${Date.now()}-${filename}.jpeg`;

                const savePath = path.join(uploadDir, resizedFilename);
                console.log(`Saving image ${i + 1} to: ${savePath}`);

                // Resize the image using sharp and save
                await sharp(originalImagePath)
                    .resize(440, 440)
                    .toFormat('jpeg')
                    .jpeg({ quality: 90 })
                    .toFile(savePath);

                images.push(resizedFilename);
            } catch (err) {
                console.error(`Error processing image ${i + 1}:`, err);
            }
        }

        // Fetch category by name
        const categoryId = await Category.findOne({ name: products.category });
        if (!categoryId) {
            return res.status(400).json({ error: 'Invalid category name' });
        }

        // Create new product object
        const newProduct = new Product({
            productName: products.productName,
            description: products.description,
            brand: products.brand || '',
            category: categoryId._id,
            regularPrice: products.regularPrice,
            salePrice: products.salePrice || 0,
            createdOn: new Date(),
            quantity: products.quantity,
            skinType: products.skinType || '',
            skinConcern: products.skinConcern || '',
            productImage: images,
            status: 'Available',
        });

        // Save the product to the database
        await newProduct.save();
        console.log('Product added successfully:', newProduct);
        return res.redirect('/admin/addProducts');
    } catch (error) {
        console.error('Error saving product:', error);
        return res.redirect('/admin/pageerror');
    }
};

// Function to fetch all products with pagination and search
const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = 4;

        // Fetching products based on the search query
        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ],
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .populate('category')
            .exec();

        // Count of total products matching the search
        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
                { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ],
        }).countDocuments();

        // Fetching categories and brands
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });

        // If categories and brands are fetched successfully
        if (category && brand) {
            res.render("products", {
                productName: search, 
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category,
                brand: brand,
            });
        } else {
            res.render("page-404");
        }
    } catch (error) {
        console.error("Error fetching products:", error);
        res.redirect("/pageError");
    }
};

// Function to add product offer
const addProductOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;

        // Find the product and its category
        const findProduct = await Product.findOne({ _id: productId });
        const findCategory = await Category.findOne({ _id: findProduct.category });

        // Check if category already has an offer
        if (findCategory.categoryOffer > percentage) {
            return res.json({ status: false, message: "This product category already has a category offer" });
        }

        // Apply offer to the product
        findProduct.salePrice = findProduct.salePrice - Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = parseInt(percentage);

        // Save the product and reset category offer
        await findProduct.save();
        findCategory.categoryOffer = 0;
        await findCategory.save();

        res.json({ status: true });

    } catch (error) {
        res.redirect("/pageError");
        res.status(500).json({ status: false, message: "internal server error" });
    }
};

// Function to remove product offer
const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;

        // Find the product and revert its sale price
        const findProduct = await Product.findOne({ _id: productId });
        const percentage = findProduct.productOffer;
        findProduct.salePrice = findProduct.regularPrice + Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = 0;

        // Save changes to product
        await findProduct.save();
        res.json({ status: true });
    } catch (error) {
        res.redirect("/pageError");
    }
};

// Function to block a product
const blockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect("/admin/products");
    } catch (error) {
        console.log("find error in blocking products", error);
        res.redirect("/pageError");
    }
}

// Function to unblock a product
const unblockProduct = async (req, res) => {
    try {
        const id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect("/admin/products");
    } catch (error) {
        console.log("error in unblocking products", error);
        res.redirect("/pageError");
    }
}

// Function to get product for editing
const geteditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const product = await Product.findOne({ _id: id });
        const category = await Category.find({});
        const brand = await Brand.find({});
        res.render("edit-product", {
            product: product,
            cat: category,
            brand: brand,
        });

    } catch (error) {
        res.redirect("/pageError");
    }
}

// Function to edit a product
const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findOne({ _id: id });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const data = req.body;

        // Check if product with the same name already exists
        const existingProduct = await Product.findOne({
            _id: { $ne: id },
            productName: data.productName,
        });

        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: 'Product with this name already exists, please try again'
            });
        }

        let updatedImages = [...(product.productImage || [])];

        // Remove images if any are marked for deletion
        if (data.removedImages) {
            const removedList = data.removedImages.split(',');
            updatedImages = updatedImages.filter(img => !removedList.includes(img));

            const uploadDir = path.join(__dirname, '../../public/uploads/product-images');
            for (const img of removedList) {
                const imagePath = path.join(uploadDir, img);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                    console.log(`Deleted image: ${img}`);
                }
            }
        }

        // Handle new file uploads
        if (req.files && req.files.length > 0) {
            const uploadDir = path.join(__dirname, '../../public/uploads/product-images');

            for (const file of req.files) {
                const resizedFilename = `uploads/product-images/resized-${Date.now()}-${file.originalname}.jpeg`;
                const savePath = path.join(uploadDir, resizedFilename);

                await sharp(file.path)
                    .resize(440, 440)
                    .toFormat('jpeg')
                    .jpeg({ quality: 90 })
                    .toFile(savePath);

                updatedImages.push(resizedFilename);

                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }

        // Update the product with new data
        const updateFields = {
            productName: data.productName,
            description: data.description,
            category: data.category || product.category,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice || 0,
            quantity: data.quantity || 0,
            skintype: data.skintype || '',
            skinConcern: data.skinConcern || '',
            productImage: updatedImages.filter(Boolean),
        };

        console.log('Updating product with:', updateFields);

        const updatedProduct = await Product.findByIdAndUpdate(id, updateFields, { new: true });

        res.status(200).json({
            success: true,
            message: "Product updated successfully",
            redirectUrl: "/admin/products"
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while updating the product"
        });
    }
};

// Function to delete a single image from a product
const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;

        console.log('Received Data:', imageNameToServer, productIdToServer);

        // Remove image from product document in DB
        const product = await Product.findByIdAndUpdate(
            productIdToServer,
            { $pull: { productImage: imageNameToServer } },
            { new: true }
        );

        if (!product) {
            console.error('Product not found');
            return res.status(404).json({ status: false, message: 'Product not found' });
        }

        const imagePath = path.join(__dirname, '../../public/uploads/product-images', imageNameToServer);
        console.log('Image Path:', imagePath);

        // Delete the image from file system if exists
        if (fs.existsSync(imagePath)) {
            await fs.promises.unlink(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);
        } else {
            console.log('Image not found in file system, but removed from database');
        }

        return res.json({ status: true, message: 'Image removed successfully' });
    } catch (error) {
        console.error('Error deleting image:', error);
        return res.status(500).json({ status: false, message: 'Internal server error' });
    }
};

module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    geteditProduct,
    editProduct,
    deleteSingleImage,
};
