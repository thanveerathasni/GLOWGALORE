const express = require("express")
const router = express.Router()
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController")
const passport = require("passport");

const couponController = require('../controllers/user/couponController'); 
const orderController = require('../controllers/user/orderController'); 
const profileController = require("../controllers/user/profileController");
const wishlistController = require('../controllers/user/wishlistController');

const cartController = require("../controllers/user/cartController");
const { userAuth } = require("../middlewares/auth");
const { ajaxAuth } = require("../middlewares/auth");
const { logged } = require("../middlewares/auth");
const { skipLoginIfLogged } = require("../middlewares/auth");

const noCache = (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
  };
  


const upload = require('multer')();
// Sign up and authentication management 
// Route for handling page not found error

router.get("/pageNotFound",userController.pageNotFound)

// Route for loading the signup page

router.get("/signup",noCache,skipLoginIfLogged,userController.loadSignup);
router.post("/signup",userController.signup)

// Shopping page route (authentication required)

router.get("/shop",userController.loadShopping)
router.post("/resend-otp",userController.resendOtp)
router.post("/verify-otp",userController.verifyOtp)
router.get("/about",userController.about)

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

router.get("/login",noCache,skipLoginIfLogged,userController.loadLogin)
router.post("/login",userController.login)

// Home page route
router.get("/",userAuth,userController.loadHomepage)
router.get("/logout",userController.logout)
router.get("/shop",userController.loadShopping)

// profile management
router.post("/update-profile-image", userAuth, upload.single('profileImage'), profileController.updateProfileImage);
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
router.post("/change-password", upload.none(),userAuth,profileController.changePasswordValid);
router.post("/verify-changepassword-otp", userAuth, profileController.verifyChangePassOtp)
router.get("/getCoupons",userAuth,profileController.getCoupons)

// updatin profileimage
router.post("/update-profile-image",userAuth, upload.single('profileImage'), profileController.updateProfileImage);

// address management

router.get("/addAddress",userAuth,profileController.addAddress);
router.get("/address",userAuth,profileController.myAddress);
router.get("/editAddress",userAuth,profileController.editAddress)
router.get("/deleteAddress",userAuth,profileController.deleteAddress)

router.post("/addAddress",userAuth,profileController.postAddAddress)
router.post("/editAddress/:addressId", userAuth, profileController.editAddressById);

router.get("/wallet",userAuth,profileController.getwallet)

//product detail

router.get("/productDetails",productController.productDetails)

// Review submission route
router.post('/orders/review', orderController.submitReview);



// Wishlist management
router.get('/wishlist', userAuth, wishlistController.getWishlistPage);
router.post('/wishlist/add', ajaxAuth, wishlistController.addToWishlist);
router.post('/cart/add-from-wishlist', ajaxAuth, wishlistController.addToCartFromWishlist);
router.post('/wishlist/remove', ajaxAuth, wishlistController.removeFromWishlist);

// cart management 

router.get("/cart",userAuth,cartController.getCartPage)
router.post("/addToCart", ajaxAuth, cartController.addToCart);
router.post("/changeQuantity", userAuth, cartController.changeQuantity);
router.get("/deleteProduct", userAuth, cartController.deleteProduct);
router.post('/placeOrder', userAuth, cartController.placeOrder);  
router.get('/order-success/:orderId', userAuth, cartController.getOrderSuccess);
router.post('/placeOrder', userAuth, cartController.placeOrder);
router.post('/applyCoupon', cartController.applyCoupon);
router.post('/removeCoupon', cartController.removeCoupon);
router.get('/mycoupons', couponController.getMyCouponsPage);
router.get('/checkout', userAuth, cartController.getCheckoutPage);

//order management
router.get('/orders', userAuth,orderController.getOrders);
router.get("/order-details", userAuth, orderController.loadOrderDetails);
router.post('/cancel-order',orderController.cancelOrder);
router.get("/download-invoice", userAuth, orderController.generateInvoice);
router.post("/orders/return", userAuth, upload.array('images', 3), orderController.requestReturn);
router.post("/orders/cancel-return", userAuth, orderController.cancelReturnRequest);
router.post('/orders/review', userAuth,orderController.submitReview);

// offer management createRazorpay

router.post("/razorpay/create-order", orderController.createRazorpay)
router.post("/create-subscription",orderController.Razorpaysubscription)
router.get("/orderFailure",orderController.loadFailure)




module.exports = router