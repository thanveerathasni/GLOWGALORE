const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Brand = require("../../models/brandSchema")
const User = require("../../models/userSchema")
const fs = require("fs")
const path = require("path")
const sharp = require("sharp")
const { area120tables } = require("googleapis/build/src/apis/area120tables")



// add products 
const addProducts = async (req, res) => {
    try {
      console.log('Request body:', req.body);
      console.log('Uploaded files:', req.files);
  
      const products = req.body;
      // Original validation, updated to match router limit (4 files)
      if (!req.files || req.files.length < 3) {
        if (req.files) {
          req.files.forEach(file => fs.existsSync(file.path) && fs.unlinkSync(file.path));
        }
        return res.status(400).json({ error: 'At least 3 product images are required' });
      }
      if (req.files.length > 4) {
        req.files.forEach(file => fs.existsSync(file.path) && fs.unlinkSync(file.path));
        return res.status(400).json({ error: 'Maximum 4 product images allowed' });
      }
  
      // Original product existence check
      const productExists = await Product.findOne({
        productName: { $regex: '^' + products.productName.trim() + '$', $options: 'i' },
      });
      if (productExists) {
        req.files.forEach(file => fs.existsSync(file.path) && fs.unlinkSync(file.path));
        return res.status(400).json({ error: 'Product already exists' });
      }
  
      // Ensure upload directory exists
      const uploadDir = path.join(__dirname, '../../public/uploads/product-images');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
  
      // Process images
      const images = [];
      for (let i = 0; i < req.files.length; i++) {
        try {
          const originalImagePath = req.files[i].path;
          const filename = req.files[i].filename;
          const resizedFilename = `/uploads/product-images/resized-${Date.now()}-${filename}.jpeg`;
          const savePath = path.join(uploadDir, path.basename(resizedFilename));
  
          console.log('Processing image:', originalImagePath);
          await sharp(originalImagePath)
            .resize(440, 440)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(savePath);
          console.log('Saved image to:', savePath);
  
          images.push(resizedFilename);
          if (fs.existsSync(originalImagePath)) {
            fs.unlinkSync(originalImagePath);
          }
        } catch (err) {
          console.error(`Error processing image ${i + 1}:`, err);
          // Clean up any processed images
          images.forEach(img => {
            const imgPath = path.join(uploadDir, path.basename(img));
            fs.existsSync(imgPath) && fs.unlinkSync(imgPath);
          });
          return res.status(500).json({ error: `Failed to process image ${i + 1}` });
        }
      }
      console.log('Images array:', images);
  
      // Original product creation
      const categoryId = await Category.findOne({ name: products.category });
      if (!categoryId) {
        images.forEach(img => {
          const imgPath = path.join(uploadDir, path.basename(img));
          fs.existsSync(imgPath) && fs.unlinkSync(imgPath);
        });
        return res.status(400).json({ error: 'Invalid category name' });
      }
       // Validate brand
    if (products.brand) {
        const brand = await Brand.findOne({ brandName: products.brand, isBlocked: false });
        if (!brand) {
          if (req.files) {
            req.files.forEach(file => fs.existsSync(file.path) && fs.unlinkSync(file.path));
          }
          return res.redirect(`/admin/addProducts?error=${encodeURIComponent('Selected brand is invalid or blocked')}`);
        }
      }
  
      const newProduct = new Product({
        productName: products.productName,
        description: products.description,
        brand: products.brand || '',
        category: categoryId._id,
        regularPrice: parseInt(products.regularPrice),
        salePrice: products.salePrice ? parseInt(products.salePrice) : 0,
        createdOn: new Date(),
        quantity: parseInt(products.quantity),
        skinType: products.skinType ? products.skinType : '',
        skinConcern: products.skinConcern ? products.skinConcern : '',
        productImage: images,
        brand: products.brand || '',
        status: 'Available',
      });
  
      await newProduct.save();
      return res.redirect('/admin/addProducts');
    } catch (error) {
      console.error('Error in addProducts:', error);
      return res.redirect('/admin/pageerror');
    }
  };

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
                productData :productData ,
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

        // Validate percentage
        const parsedPercentage = parseInt(percentage);
        if (isNaN(parsedPercentage) || parsedPercentage < 1 || parsedPercentage > 99) {
            return res.status(400).json({ error: 'Offer percentage must be between 1 and 99' });
        }

        // Find the product and its category
        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const findCategory = await Category.findOne({ _id: findProduct.category });
        if (!findCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Apply offer to the product
        findProduct.productOffer = parsedPercentage;
        // Calculate maxOffer considering productOffer and categoryOffer
        const maxOffer = Math.max(findProduct.productOffer, findCategory.categoryOffer || 0);
        findProduct.salePrice = findProduct.regularPrice - Math.floor(findProduct.regularPrice * (maxOffer / 100));

        // Save the product
        await findProduct.save();

        res.json({ status: true });
    } catch (error) {
        console.error('Error adding product offer:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Function to remove product offer
const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;

        // Find the product and revert its sale price
        const findProduct = await Product.findOne({ _id: productId });
        if (!findProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const findCategory = await Category.findOne({ _id: findProduct.category });
        if (!findCategory) {
            return res.status(404).json({ error: 'Category not found' });
        }
        findProduct.productOffer = 0;
        // Recalculate salePrice based on remaining categoryOffer
        const maxOffer = findCategory.categoryOffer || 0;
        findProduct.salePrice = findProduct.regularPrice - Math.floor(findProduct.regularPrice * (maxOffer / 100));

        // Save changes to product
        await findProduct.save();
        res.json({ status: true });
    } catch (error) {
        console.error('Error removing product offer:', error);
        res.status(500).json({ error: 'Internal server error' });
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
   
        const brand = await Brand.find({ isBlocked: false });
        res.render("edit-product", {
            product: product,
            cat: category,
            brand: brand,
            error:null,
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
            return res.status(404).json({ error: 'Product not found' });
        }

        const data = req.body;

        // Validate form fields
        if (!data.productName || data.productName.trim().length < 4 || data.productName.trim().length > 20) {
            return res.status(400).json({ error: 'Product name must be 4-20 characters long' });
        }
        if (!/^[a-zA-Z0-9\s\-,.&()]+$/.test(data.productName.trim())) {
            return res.status(400).json({ error: 'Product name can only contain letters, numbers, spaces, and -,.&()' });
        }
        if (!data.description || data.description.trim().length < 10 || data.description.trim().length > 250) {
            return res.status(400).json({ error: 'Description must be 10-250 characters long' });
        }
        if (!data.category) {
            return res.status(400).json({ error: 'Category is required' });
        }
        if (!data.regularPrice || !/^\d+$/.test(data.regularPrice) || parseInt(data.regularPrice) <= 0) {
            return res.status(400).json({ error: 'Regular price must be a positive integer' });
        }
        if (parseInt(data.regularPrice) > 10000) {
            return res.status(400).json({ error: 'Regular price cannot exceed 10,000' });
        }
        if (data.salePrice) {
            if (!/^\d+$/.test(data.salePrice) || parseInt(data.salePrice) <= 0) {
                return res.status(400).json({ error: 'Sale price must be a positive integer' });
            }
            if (parseInt(data.salePrice) >= parseInt(data.regularPrice)) {
                return res.status(400).json({ error: 'Sale price must be less than regular price' });
            }
            if (parseInt(data.salePrice) > 10000) {
                return res.status(400).json({ error: 'Sale price cannot exceed 10,000' });
            }
        }
        if (!data.quantity || !/^\d+$/.test(data.quantity) || parseInt(data.quantity) < 0) {
            return res.status(400).json({ error: 'Quantity must be a non-negative integer' });
        }
        if (parseInt(data.quantity) > 10000) {
            return res.status(400).json({ error: 'Quantity cannot exceed 10,000' });
        }
        if (data.skintype && (data.skintype.trim().length < 3 || data.skintype.trim().length > 50)) {
            return res.status(400).json({ error: 'Skin type must be 3-50 characters long' });
        }
        if (data.skintype && !/^[a-zA-Z0-9\s]+$/.test(data.skintype.trim())) {
            return res.status(400).json({ error: 'Skin type can only contain letters, numbers, and spaces' });
        }
        if (data.skinConcern && (data.skinConcern.trim().length < 3 || data.skinConcern.trim().length > 50)) {
            return res.status(400).json({ error: 'Skin concern must be 3-50 characters long' });
        }
        if (data.skinConcern && !/^[a-zA-Z0-9\s]+$/.test(data.skinConcern.trim())) {
            return res.status(400).json({ error: 'Skin concern can only contain letters, numbers, and spaces' });
        }

        // Check if product with the same name already exists (case-insensitive)
        const existingProduct = await Product.findOne({
            _id: { $ne: id },
            productName: { $regex: '^' + data.productName.trim() + '$', $options: 'i' }
        });
        // if (existingProduct) {
        //     return res.status(400).json({ error: 'Product already exists' });
        // }

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
           // Validate brand
           if (data.brand) {
            const brand = await Brand.findOne({ brandName: data.brand, isBlocked: false });
            if (!brand) {
                return res.status(400).json({ success: false, error: 'Selected brand is invalid or blocked' });
            }
        }
        
        // Validate images
        if (req.files && req.files.length > 0) {
            const totalImages = updatedImages.length + req.files.length;
            if (totalImages < 3) {
                return res.status(400).json({ error: 'At least 3 product images are required' });
            }
            if (totalImages > 8) {
                req.files.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
                return res.status(400).json({ error: 'Maximum 8 product images allowed' });
            }
        }

        // Handle new file uploads
        if (req.files && req.files.length > 0) {
            const uploadDir = path.join(__dirname, '../../public/uploads/product-images');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            for (const file of req.files) {
                // Remove existing extension and use .jpeg
                const baseName = path.basename(file.originalname, path.extname(file.originalname));
                const resizedFilename = `resized-${Date.now()}-${baseName}.jpeg`;
                const savePath = path.join(uploadDir, resizedFilename);

                await sharp(file.path)
                    .resize(440, 440)
                    .toFormat('jpeg')
                    .jpeg({ quality: 90 })
                    .toFile(savePath);

                updatedImages.push(`/uploads/product-images/${resizedFilename}`);

                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }
        }

        // Validate final image count
        if (updatedImages.length < 3) {
            return res.status(400).json({ error: 'At least 3 product images are required' });
        }
        if (updatedImages.length > 8) {
            return res.status(400).json({ error: 'Maximum 8 product images allowed' });
        }

        // Update the product with new data
        const updateFields = {
            productName: data.productName.trim(),
            description: data.description.trim(),
            category: data.category || product.category,
            regularPrice: parseInt(data.regularPrice),
            salePrice: data.salePrice ? parseInt(data.salePrice) : 0,
            quantity: parseInt(data.quantity),
            skinType: data.skinType || '',
            skinConcern: data.skinConcern ? data.skinConcern.trim() : '',
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
        res.status(500).json({ error: 'Internal server error' });
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
            return res.status(404).json({ error: 'Product not found' });
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
        return res.status(500).json({ error: 'Internal server error' });
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



