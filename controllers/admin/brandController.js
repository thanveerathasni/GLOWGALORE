const Brand = require("../../models/brandSchema")
const Product = require("../../models/productSchema")


// Function to load the brands page with pagination

const getBrandPage = async (req, res) => {
    try {
        // Pagination logic: get the current page and set limit per page

        const page = parseInt(req.query.page) || 1
        const limit = 4;
        const skip = (page - 1) * limit;

        // Fetch brands, sort by creation date, and apply pagination (skip & limit)

        const brandData = await Brand.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit)
        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands / limit)
        const reverseBrand = brandData.reverse()

        // Render the brands page with data, including pagination information

        res.render("brands", {
            data: reverseBrand,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands,
        })
    } catch (error) {
        res.redirect("/pageError")

    }

}

// Function to add a new brand

const addBrand = async (req, res) => {

    try {
        const brand = req.body.name;
        const findBrand = await Brand.findOne({ brand });
        if (!findBrand) {
            // If the brand doesn't exist, save the new brand

            const image = req.file.filename;
            const newBrand = new Brand({
                brandName: brand,
                brandImage: image,
            })
            await newBrand.save()
            res.redirect("/admin/brands")
        }
    } catch (error) {
        res.redirect("/pageError")
    }

}
// Function to block a brand by updating its 'idBlocked' field


const blockBrand = async (req, res) => {
    try {
        const id = req.query.id;
        await Brand.updateOne({ _id: id }, { $set: { idBlocked: true } })
        res.redirect("/admin/brands");
    } catch (error) {
        res.redirect("/pageError")
    }

}
// Function to unblock a brand by updating its 'idBlocked' field


const unblockBrand = async (req, res) => {
    try {
        const id = req.query.id;
        await Brand.updateOne({ _id: id }, { $set: { idBlocked: false } })
        res.redirect("/admin/brands");
    } catch (error) {
        res.redirect("/pageError")
    }

}
// Function to delete a brand by its ID


const deleteBrand = async (req, res) => {
    try {
        const { id } = req.query;
        if (!id) {
            return res.status(400).redirect("/pageError")
        }
        await Brand.deleteOne({ _id: id });
        res.redirect("/admin/brands")
    } catch (error) {
        console.log("error deleting brands", error)
        res.status(500).redirect("/pageError")

    }

}

module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unblockBrand,
    deleteBrand,
}











