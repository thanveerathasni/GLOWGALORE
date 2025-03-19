const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")


const categoryInfo = async (req,res)=>{
    try{
        const page = parseInt(req.query.page)||1;
        const limit = 4;
        const skip = (page-1)*limit

        const categoryData = await Category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages=Math.ceil(totalCategories/limit)
        res.render("category",{
            cat:categoryData,
            currentPage:page,
            totalPages: totalPages,
            totalCategories: totalCategories
        })
    }catch(error){

        console.error(error)
        res.redirect("/pageError")
    }
}

const addCategory = async (req,res)=>{
    const {name,description} = req.body;
    try{
        const existingCategory = await Category.findOne({name});
        if(existingCategory){
            return res.status(400).json({error:"Category already exists"})
        }
        const newCategory = new Category({
            name,
            description,
        })
        await newCategory.save()
        return res.json({message:"Category added succesfully"})
    }catch(error){
        return res.status(500).json({error:"Internal server error"})

    }
}

const addCategoryOffer = async (req,res)=>{
    try{
        const percentage = parseInt(req.body.percentage);
        console.log("hellooo",req.body.percentage)
        const categoryId = req.body.categoryId
        const category= await Category.findById(categoryId);
    if(!category){
        return res.status(404).json({status:false,message:"Category not found"})
    }  
    const products = await Product.find({category:category._id})
    const hashProductOffer = products.some((product)=> product.productOffer>percentage)
    if(hashProductOffer){
        return res.json({status:false,message:"Products within this category already have product offer"})
    }
    await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}});

    for (const product of products){
        product.productOffer = 0;
        product.salePrice = product.regularPrice;
        await product.save()

    }
    res.json({status:true})
  }catch(error){
    res.status(500).json({status:false,message:"internal server error"})
  }
}


const removeCategoryOffer = async (req,res)=>{
    try {

        const categoryId = req.body.categoryId;
        const category = await Category.findOne(categoryId)

        if(!category){
            return res.status(404).json({status:false,message:"Category not found"})
        }
        const percentage = category.categoryOffer;
        const products = await Product.find({category:category._id})

        if(products.length>0){
            for(const product of products){
                product.salePrice += Math.floor(product.regularPrice*(percentage/100))
                product.productOffer =0;
                await product.save()
            }
        }
        category.categoryOffer = 0
        await category.save()
        res.json({status:true})

        
    } catch (error) {
        return res.status(500).json({status:false,message:"internal server error"})

    }
    
}

const listedCategory = async(req,res)=>{
    try {
      let id = req.query.id;
      await Category.updateOne({_id:id},{$set:{isListed:false}}) 
      res.redirect("/admin/category")  


    } catch (error) {
        res.redirect("/pageError")
        
    }
}

const unlistedCategory= async(req,res)=>{

    try {
        let id = req.query.id;
        await Category.updateOne({_id:id},{$set:{isListed:true}}) 
        res.redirect("/admin/category")  
  
  
      } catch (error) {
          res.redirect("/pageError")
          
      }
}
const editCategory = async (req,res) => {
    try {
        const id = req.query.id;
        const category = await Category.findOne({_id:id});
        res.render("edit-category",{category:category})
    } catch (error) {
        res.redirect("/pageError")
    }
    
 }
 const posteditCategory = async (req,res) => {
    try {
        const id = req.params.id;
       
        const {categoryName,description} = req.body;
        const existingCategory = await Category.findOne({name:categoryName})
        if (existingCategory) {
            return res.status(400).json({error:"Category exists please choose another name"})
            
        }
        const updateCategory = await Category.findByIdAndUpdate(id,{
            name:categoryName,
            description:description,
        },{new:true})


        if(updateCategory){
            res.redirect("/admin/category")

        }else{
            res.status(404).json({error:"Category not found"})
        }
        
    } catch (error) {
        res.status(500).json({error:"internal server error"})
        
    }
    
 }


module.exports={
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    listedCategory,
    unlistedCategory,
    editCategory,
    posteditCategory,
    
}