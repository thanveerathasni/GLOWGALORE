const express = require("express")
const router = express.Router()
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController")
const passport = require("passport");
const orderController = require('../controllers/user/orderController'); 
const profileController = require("../controllers/user/profileController");
const cartController = require("../controllers/user/cartController");
const { userAuth } = require("../middlewares/auth");
const { ajaxAuth } = require("../middlewares/auth");

const upload = require('multer')();
// Sign up and authentication management 
// Route for handling page not found error

router.get("/pageNotFound",userController.pageNotFound)

// Route for loading the signup page

router.get("/signup",userController.loadSignup);
router.post("/signup",userController.signup)

// Shopping page route (authentication required)

router.get("/shop",userController.loadShopping)
router.post("/resend-otp",userController.resendOtp)
router.post("/verify-otp",userController.verifyOtp)

// Google authentication routes

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    try {
        req.session.user = req.user._id;
        res.redirect('/');
    } catch (error) {
        console.log("Google login error:", error);
        res.redirect('/signup');
    }
})

// Login management

router.get("/login",userController.loadLogin)
router.post("/login",userController.login)

// Home page route
router.get("/",userController.loadHomepage)
router.get("/logout",userController.logout)
router.get("/shop",userAuth,userController.loadShopping)

// profile management

router.get("/forgot-password",profileController.getForgetPassword);
router.post("/forgot-email-valid",profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp);
router.get("/reset-password",profileController.getResetPassword);
router.post("/resend-forgot-otp",profileController.resendOtp);
router.post("/reset-password",profileController.postNewPassword);
router.get("/dashboard",userAuth, profileController.userProfile);
router.get("/change-email",userAuth,profileController.changeEmail);
router.post("/change-email",userAuth,profileController.changeEmailValid);
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp)
router.post("/update-email", userAuth, profileController.updateEmail);
router.get("/editProfile",userAuth,profileController.editProfile)
router.get("/change-password",userAuth,profileController.changePassword);
router.post("/change-password",userAuth,profileController.changePasswordValid);
router.post("/verify-changepassword-otp", userAuth, profileController.verifyChangePassOtp)

//img
router.post("/update-profile-image",userAuth, upload.single('profileImage'), profileController.updateProfileImage);
// address

router.get("/addAddress",userAuth,profileController.addAddress);
router.get("/address",userAuth,profileController.myAddress);
router.get("/editAddress",userAuth,profileController.editAddress)
router.get("/deleteAddress",userAuth,profileController.deleteAddress)

router.post("/addAddress",userAuth,profileController.postAddAddress)
router.post("/editAddress/:addressId", userAuth, profileController.editAddressById);

//order management
router.get('/orders', userAuth,orderController.getOrders);
router.post('/cancelOrder/:orderId', userAuth, orderController.cancelOrder);
router.post('/returnOrder/:orderId', userAuth, orderController.returnOrder);
router.get('/invoice/:orderId', userAuth, orderController.downloadInvoice);
router.get('/order/:orderId', userAuth, orderController.getOrderDetails);



//product detail

router.get("/productDetails",userAuth,productController.productDetails)

// cart management 

router.get("/cart",userAuth,cartController.getCartPage)
router.post("/addToCart", ajaxAuth, cartController.addToCart);
router.post("/changeQuantity", userAuth, cartController.changeQuantity);
module.exports = router