const express =require("express")
const router = express.Router()
const adminController = require("../controllers/admin/adminController")
const {userAuth,adminAuth} = require("../middlewares/auth")
const customerController = require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController")
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
router.get("/",adminAuth,adminController.loadDashboard)
router.post ("/pageError",adminController.pageError)
router.get("/logout",adminController.logout)

//customer management
router.get("/users",adminAuth,customerController.customerInfo);
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked);

// category management

router.get("/category",adminAuth,categoryController.categoryInfo);
router.post("/addCategory",adminAuth,categoryController.addCategory);
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer);
router.get("/listedCategory",adminAuth,categoryController.listedCategory)
router.get("/unlistedCategory",adminAuth,categoryController.unlistedCategory)
router.get("/editCategory",adminAuth,categoryController.editCategory)
router.post("/editCategory/:id",adminAuth,categoryController.posteditCategory)

// brand management

router.get("/brands",adminAuth,brandController.getBrandPage)
// router.post("/addBrand",adminAuth.uploads.array("image"),brandController.addBrand)
router.get("/blockBrand",adminAuth,brandController.blockBrand)
router.get("/unblockBrand",adminAuth,brandController.unblockBrand)
router.get("/deleteBrand",adminAuth,brandController.deleteBrand)

// product management

router.get("/addProducts",adminAuth,productController.getProductAddPage)
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts)
router.get("/products",adminAuth,productController.getAllProducts)
router.post("/addProductOffer",adminAuth,productController.addProductOffer);
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer);
router.get("/blockProduct",adminAuth,productController.blockProduct)
router.get("/unblockProduct",adminAuth,productController.unblockProduct)
router.get("/editProducts",adminAuth,productController.geteditProduct)
router.post("/editProducts/:id",adminAuth,uploads.array('imageFile', 8),productController.editProduct)
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)


// banner management 

router.get("/banner",adminAuth,bannerController.getBannerPage)
router.get("/addBanner",adminAuth,bannerController.getAddBannerPage)
router.post("/addBanner",adminAuth,uploads.single("images"),bannerController.addBanner)
router.get("/deleteBanner",adminAuth,bannerController.deleteBanner)

//order mnagement

router.get('/orders', adminAuth, orderController.getOrders);
router.get('/orders/:id', adminAuth, orderController.getOrderDetails);
router.post('/orders/update-status', adminAuth, orderController.updateOrderStatus);
router.post('/orders/handle-return', adminAuth, orderController.handleReturnRequest);
router.post('/orders/update-return-status', adminAuth, orderController.updateReturnStatus);
router.post('/orders/cancel', adminAuth, orderController.cancelOrder);


module.exports = router 