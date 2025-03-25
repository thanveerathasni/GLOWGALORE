const express = require("express")
const router = express.Router()
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController")
const passport = require("passport");
const profileController = require("../controllers/user/profileController");
const { userAuth } = require("../middlewares/auth");

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
router.get("/userProfile", userAuth, profileController.userProfile);
router.get("/change-email",userAuth,profileController.changeEmail);
router.post("/change-email",userAuth,profileController.changeEmailValid);
// router.get("/change-password",userAuth,profileController.changePassword);


//product detail

router.get("/productDetails",userAuth,productController.productDetails)

module.exports = router