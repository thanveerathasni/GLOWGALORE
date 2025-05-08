const express =require("express")
const router = express.Router()
const adminController = require("../controllers/admin/adminController")
const {userAuth,adminAuth,adminloggedin} = require("../middlewares/auth")
const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
const couponController = require("../controllers/admin/couponController")
const offerController = require('../controllers/admin/offerController');
const salesController = require("../controllers/admin/salesController")
const dashboardController = require('../controllers/admin/dashboardController');


const brandController = require("../controllers/admin/brandController")
const productController = require("../controllers/admin/productController")
const bannerController = require("../controllers/admin/bannerController");
const orderController = require("../controllers/admin/orderController");

// const multer = require("multer")
const uploads = require("../helpers/multer")
// const uploads= multer({storage:storage})
// const upload = multer({ dest: 'public/uploads/' });


// Attach the uploads middleware to adminAuth
// adminAuth.uploads = multer({ storage: storage });


router.get ("/pageError",adminController.pageError)

// login management

router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login);
router.get("/",adminAuth,adminloggedin,adminController.loadDashboard)
router.post ("/pageError",adminController.pageError)
router.get("/logout",adminController.logout)

//customer management

router.get("/users",adminAuth,adminloggedin,customerController.customerInfo);
router.get("/blockCustomer",adminAuth,adminloggedin,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,adminloggedin,customerController.customerunBlocked);

// category management

router.get("/category",adminAuth,adminloggedin,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,adminloggedin,categoryController.addCategory);
router.post("/addCategoryOffer",adminAuth,adminloggedin,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,adminloggedin,categoryController.removeCategoryOffer);
router.get("/listedCategory",adminAuth,adminloggedin,categoryController.listedCategory)
router.get("/unlistedCategory",adminAuth,adminloggedin,categoryController.unlistedCategory)
router.get("/editCategory",adminAuth,adminloggedin,categoryController.editCategory)
router.post("/editCategory/:id",adminAuth,adminloggedin,categoryController.posteditCategory)

// brand management
const upload = require("../helpers/multer")// const adminAuth = require('../middleware/adminAuth'); // Your auth middleware

// Use upload.single for single file or upload.array for multiple files
router.post('/addBrand', adminAuth,adminloggedin, upload.single('image'), brandController.addBrand);
router.get("/brands",adminAuth,adminloggedin,brandController.getBrandPage)
// router.post("/addBrand",adminAuth.uploads.array("image"),brandController.addBrand)
router.get("/blockBrand",adminAuth,adminloggedin,brandController.blockBrand)
router.get("/unblockBrand",adminAuth,adminloggedin,brandController.unblockBrand)
router.get("/deleteBrand",adminAuth,adminloggedin,brandController.deleteBrand)

// product management

router.get("/addProducts",adminAuth,adminloggedin,productController.getProductAddPage)
router.post("/addProducts",adminAuth,adminloggedin,uploads.array("images",4),productController.addProducts)
router.get("/products",adminAuth,adminloggedin,productController.getAllProducts)
router.post("/addProductOffer",adminAuth,adminloggedin,productController.addProductOffer);
router.post("/removeProductOffer",adminAuth,adminloggedin,productController.removeProductOffer);
router.get("/blockProduct",adminAuth,adminloggedin,productController.blockProduct)
router.get("/unblockProduct",adminAuth,adminloggedin,productController.unblockProduct)
router.get("/editProducts",adminAuth,adminloggedin,productController.geteditProduct)
router.post("/editProducts/:id",adminAuth,adminloggedin,uploads.array('imageFile', 8),productController.editProduct)
router.post("/deleteImage",adminAuth,adminloggedin,productController.deleteSingleImage)


// banner management 

router.get("/banner",adminAuth,adminloggedin,bannerController.getBannerPage)
router.get("/addBanner",adminAuth,adminloggedin,bannerController.getAddBannerPage)
router.post("/addBanner",adminAuth,adminloggedin,uploads.single("images"),bannerController.addBanner)
router.get("/deleteBanner",adminAuth,adminloggedin,bannerController.deleteBanner)

//order mnagement

router.get('/orders', adminAuth,adminloggedin, orderController.getOrders);
router.get('/orders/:id', adminAuth,adminloggedin, orderController.getOrderDetails);
router.post('/orders/update-status', adminAuth,adminloggedin, orderController.updateOrderStatus);
router.post('/orders/handle-return', adminAuth,adminloggedin, orderController.handleReturnRequest);
router.post('/orders/update-return-status', adminAuth,adminloggedin, orderController.updateReturnStatus);
router.post('/orders/cancel', adminAuth,adminloggedin, orderController.cancelOrder);


//coupon management

router.get("/coupon",adminAuth,adminloggedin,couponController.loadCoupon)
router.post('/createCoupon', adminAuth,adminloggedin, couponController.createCoupon);
router.get("/editCoupon",adminAuth,adminloggedin,couponController.editCoupon)
router.post("/updateCoupon",adminAuth,adminloggedin,couponController.updateCoupon)
router.get("/deletecoupon",adminAuth,adminloggedin,couponController.deleteCoupon)


// offer management

router.get('/offers', adminAuth,adminloggedin, offerController.getAllOffers);
router.post('/offers/add', adminAuth,adminloggedin, offerController.addOffer);

//sales management

router.get('/sales', adminAuth,adminloggedin, salesController.loadSalesPage);
router.get('/sales/report', adminAuth,adminloggedin, salesController.loadSalesPage);

// dashboard management

router.get('/dashboard',adminAuth,adminloggedin, dashboardController.getAdminDashboard);
router.get('/getLedgerData',adminAuth,adminloggedin, dashboardController.getLedgerData);



module.exports = router 