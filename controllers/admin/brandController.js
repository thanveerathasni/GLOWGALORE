const Brand = require('../../models/brandSchema');
const Product = require('../../models/productSchema');
const path = require('path');
const fs = require('fs');

const getBrandPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const brandData = await Brand.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);

    res.render('brands', {
      data: brandData,
      currentPage: page,
      totalPages: totalPages,
      totalBrands: totalBrands,
      error: req.query.error || null,
    });
  } catch (error) {
    console.error('Error in getBrandPage:', error);
    res.redirect(`/admin/pageError?error=${encodeURIComponent('Failed to load brands')}`);
  }
};

const addBrand = async (req, res) => {
  try {
    const brandName = req.body.name?.trim();
    if (!brandName || brandName.length < 2 || brandName.length > 50) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.redirect(`/admin/brands?error=${encodeURIComponent('Brand name must be 2-50 characters long')}`);
    }
    if (!/^[a-zA-Z0-9\s\-&]+$/.test(brandName)) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.redirect(`/admin/brands?error=${encodeURIComponent('Brand name can only contain letters, numbers, spaces, -, and &')}`);
    }

    const findBrand = await Brand.findOne({ brandName: { $regex: '^' + brandName + '$', $options: 'i' } });
    if (findBrand) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.redirect(`/admin/brands?error=${encodeURIComponent('Brand already exists')}`);
    }

    if (!req.file) {
      return res.redirect(`/admin/brands?error=${encodeURIComponent('Brand image is required')}`);
    }

    const uploadDir = path.join(__dirname, '../../public/uploads/brand-images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = req.file.filename;
    const resizedFilename = `/uploads/brand-images/resized-${Date.now()}-${filename}.jpeg`;
    const savePath = path.join(uploadDir, path.basename(resizedFilename));

    await require('sharp')(req.file.path)
      .resize(200, 200)
      .toFormat('jpeg')
      .jpeg({ quality: 90 })
      .toFile(savePath);

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const newBrand = new Brand({
      brandName: brandName,
      brandImage: resizedFilename,
      isBlocked: false,
    });

    await newBrand.save();
    res.redirect('/admin/brands');
  } catch (error) {
    console.error('Error in addBrand:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.redirect(`/admin/pageError?error=${encodeURIComponent('Failed to add brand')}`);
  }
};

const blockBrand = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.redirect(`/admin/brands?error=${encodeURIComponent('Invalid brand ID')}`);
    }
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect('/admin/brands');
  } catch (error) {
    console.error('Error in blockBrand:', error);
    res.redirect(`/admin/pageError?error=${encodeURIComponent('Failed to block brand')}`);
  }
};

const unblockBrand = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.redirect(`/admin/brands?error=${encodeURIComponent('Invalid brand ID')}`);
    }
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect('/admin/brands');
  } catch (error) {
    console.error('Error in unblockBrand:', error);
    res.redirect(`/admin/pageError?error=${encodeURIComponent('Failed to unblock brand')}`);
  }
};

const deleteBrand = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.redirect(`/admin/brands?error=${encodeURIComponent('Invalid brand ID')}`);
    }

    const brand = await Brand.findById(id);
    if (!brand) {
      return res.redirect(`/admin/brands?error=${encodeURIComponent('Brand not found')}`);
    }

    const productsUsingBrand = await Product.find({ brand: brand.brandName });
    if (productsUsingBrand.length > 0) {
      return res.redirect(`/admin/brands?error=${encodeURIComponent('Cannot delete brand used by products')}`);
    }

    const imagePath = path.join(__dirname, '../../public', brand.brandImage);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await Brand.deleteOne({ _id: id });
    res.redirect('/admin/brands');
  } catch (error) {
    console.error('Error in deleteBrand:', error);
    res.redirect(`/admin/pageError?error=${encodeURIComponent('Failed to delete brand')}`);
  }
};

module.exports = {
  getBrandPage,
  addBrand,
  blockBrand,
  unblockBrand,
  deleteBrand,
};