const Product = require("../../models/productSchema")
const Category= require("../../models/categorySchema")
const User= require("../../models/userSchema")

// Fetch and display product details

const productDetails = async (req,res) => {
    try{
        const userId = req.session.user;
        const userData = await User.findById(userId)
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');
        const findCategory = product.category;
        const productOffer = product.productOffer||0
        const categoryOffer = findCategory?.categoryOffer||0;
        const totalOffer = categoryOffer+ productOffer;
        // Render product detail page
        res.render("product-detail",{
            user:userData,
            product:product,
            quantity:product.quantity,
            totalOffer:totalOffer,
            category:findCategory,
        })
    }catch(error){
        console.log(error,"error in fetching product details")
   
        res.redirect("/pageNotFount")


    }
    
}


module.exports={
    productDetails,
}

