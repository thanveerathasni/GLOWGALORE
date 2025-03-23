const User = require("../../models/userSchema")
const nodemailer = require("nodemailer")
const env = require("dotenv").config()
const bcrypt = require("bcrypt")
const Category = require("../../models/categorySchema")
const Product = require("../../models/productSchema")
const Banner = require("../../models/bannerSchema");

// Render 404 page when page not found

const pageNotFound = async (req, res) => {
    try {

        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}
// Log out the user by destroying the session

const logout = async (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("session destruction error",err.message)
                return res.redirect("/pageNotFound")
            }
            return res.redirect("/login")
        })
    } catch (error) {
        console.log("Logout error",error)
        res.redirect("/pageNotFound")
        
    }
}

// Load homepage with banners and products

const loadHomepage = async (req, res) => {
    try {
        const today = new Date().toISOString();
        const findBanner = await Banner.find({
            startDate:{$lt:new Date(today)},
            endDate:{$gt:new Date(today)},
        })
        const user = req.session.user;
        const categories = await Category.find({isListed:true})
        let productData = await Product.find({isBlocked:false,category:{$in:categories.map(category=>category._id)},quantity:{$gt:0}})
        // Sort products by creation date

        productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn))
        productData= productData.slice(0,4);
        
        console.log("user:",user)
        if(user){
             const userData = await User.findById(user)
            return res.render("home",{user:userData , products:productData, banner: findBanner ||[],})
            


        }else{
            return res.render("home",{products: productData , banner: findBanner ||[]})
        }




    } catch (error) {
        console.log('home page not working')
        res.status(500).send("server error")
    }
}
// Render the signup page

const loadSignup = async (req, res) => {
    try {
        return res.render('signup');
    } catch (error) {
        console.log("home page not loading")
        res.status(500).send("server Error")
    }
}
// Generate a random OTP

function genarateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send verification email with OTP

const sendVerificationEmail = async (email, otp) => {
    try {

        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        })

        const mailOption = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b><h4>Your OTP : ${otp}</h4><br></b>`,

        }

        const info = await transporter.sendMail(mailOption);
        console.log("Email sent:", info.messageId)

        return true;

    } catch (error) {

        console.error("error sending email", error);
        return false

    }
}

// Handle user signup process

const signup = async (req, res) => {
    try {
        const { name, email, password, Cpassword } = req.body;
        if (password !== Cpassword) {
            return res.render("signup", { message: "Password do not match" });
        }

        const otp = genarateOtp();
        const emailSent = await sendVerificationEmail(email, otp)
        if (!emailSent) {
            return res.json("email.error heree the problem")
        }

        req.session.userOtp = otp;
        console.log("req.session.userOtp:",req.session.userOtp)
        req.session.userData = { name, email, password }

        res.render("verify-otp")
        console.log("OTP send", otp)
    } catch (error) {
        console.log("signup error", error)
        res.redirect("/pageNotFound")

    }
}
// Hash the password

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    } catch (error) {

    }
}
// Verify OTP entered by user

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        // Input validation
        if (!otp || typeof otp !== 'string' || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP format. Please provide a 6-digit number.'
            });
        }

        // Check if session data exists
        if ( !req.session.userOtp ) {
            return res.status(401).json({
                success: false,
                message: 'Session expired or invalid. Please request a new OTP.'
            });
        }

        // Verify OTP
        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            
            // Validate user data
            if (!user.name || !user.email || !user.password) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user data in session.'
                });
            }

            // Hash password
            const passwordHash = await securePassword(user.password);


            // Create and save new user
            const saveUserData = new User({
                name: user.name,
                email: user.email,
                password: passwordHash,
                isVerified: true, // Add verification status
                createdAt: new Date()
            });

            const savedUser = await saveUserData.save();

            // Update session with new user data
            req.session.user = savedUser._id;
            req.session.userOtp = null; // Clear OTP after successful verification
            req.session.userData = null; // Clear temporary user data

            return res.status(200).json({
                success: true,
                message: 'OTP verified successfully. Account created.',
                redirectUrl:'/'            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please try again.'
            });
        }

    } catch (error) {
        console.error('Error in verifyOtp:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred during OTP verification. Please try again later.'
        });
    }
};
// Resend OTP if the user needs it

const resendOtp = async(req,res)=>{
    try{
        const {email}= req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"OTP Resend error , email not found"})

        }
        const otp = genarateOtp();
        const emailSent = await sendVerificationEmail(email, otp)

        if(emailSent){
            console.log("Resend otp",otp)
            res.status(200).json({success:true,message:"OTP Resend successfully"})
        }else{
            res.status(500).json({success:false,message:"Failed to resend otp. please try again"})

        }
    }catch(error){
        console.log("error resending OTP", error)
        res.status(500).json({success:false,message:"Internal server error, please try again later"})
    }
   
}

// Load the login page

const loadLogin = async (req,res)=>{
    try {
        if(!req.session.user){
            
            return res.render("login",{message:null})
        }else{
            res.redirect("/")
        }
        
    } catch (error) {
        res.redirect("/pageNotFound")
        
    }
}
// Handle user login

const login = async (req,res)=>{
    try {
        const {email,password}= req.body;
        const findUser = await User.findOne({email:email});

        if(!findUser){
            return res.render("login",{message:"User not found"})
        }
        if(findUser.isBlocked){
            return res.render("login",{message:"User is blocked by admin"})
            
        }
        const passwordMatch = await bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
            return res.render("login",{message:"Incorrect password"})
        }
        req.session.user = findUser._id;
        res.redirect("/")

    } catch (error) {
        console.log("login error",error)
        res.render("login",{message:"login failed .  please try again later"})
    }
}
// Load shopping page with filters and sorting

const loadShopping = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);

        // Fetch categories (only listed ones)
        const categories = await Category.find({ isListed: true });

        // Get query parameters from frontend
        const { sort, search } = req.query;
        

        // Build product query
        let productQuery = { isBlocked: false };

        // Add search functionality
        if (search) {
            productQuery.productName = { $regex: search, $options: 'i' }; 
        }

        // Sorting logic
        let sortOption = {};
    

        switch (sort) {
            case 'lowToHigh':
                sortOption = { salePrice: 1 };
                break;
            case 'highToLow':
                sortOption = { salePrice: -1 }; 
                break;
            case 'aToZ':
                sortOption = { productName: 1 };
            case 'zToA':
                sortOption = { productName: -1 };
                break;
            case 'newArrivals':
                sortOption = { createdAt: -1 }; 
                break;
            default:
                sortOption = { createdAt: -1 }; 
        }
        

        // Fetch products with filtering and sorting
        const products = await Product.find(productQuery)
            .sort(sortOption)
            .populate('category'); // Populate category field for frontend filtering

        // Render the shop page
        return res.render('shop', {
            products,
            userData,
            categories,
            sort,
            search
        });
    } catch (error) {
        console.error('Error loading shopping page:', error);
        return res.status(500).send('Server Error');
    }
};




module.exports = {
    loadHomepage,
    pageNotFound,
    loadShopping,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp,
    loadLogin,
    login,
    logout,


}