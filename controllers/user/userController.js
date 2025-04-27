
const User = require("../../models/userSchema");
const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Banner = require("../../models/bannerSchema");
const Coupon = require("../../models/couponSchema");
// const { generateReferralCode } = require("../utils"); // CHANGE: Import utility

const pageNotFound = async (req, res) => {
    try {
        res.render("page-404");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

async function generateReferralCode() {
    let code;
    let isUnique = false;
    while (!isUnique) {
        code = 'GG' + Math.random().toString(36).substr(2, 6).toUpperCase();
        const existing = await User.findOne({ referralCode: code });
        if (!existing) isUnique = true;
    }
    return code;
}



const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log("session destruction error", err.message);
                return res.redirect("/pageNotFound");
            }
            res.clearCookie('connect.sid');
            return res.redirect("/login");
        });
    } catch (error) {
        console.log("Logout error", error);
        res.redirect("/pageNotFound");
    }
};

const loadHomepage = async (req, res) => {
    try {
        const today = new Date().toISOString();
        const findBanner = await Banner.find({
            startDate: { $lt: new Date(today) },
            endDate: { $gt: new Date(today) },
        });
        const user = req.session.user;
        const categories = await Category.find({ isListed: true });
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: categories.map(category => category._id) },
            quantity: { $gt: 0 },
        });
        //  Calculate salePrice for each product
        productData = productData.map(product => {
            const category = categories.find(cat => cat._id.equals(product.category));
            const maxOffer = Math.max(product.productOffer || 0, category?.categoryOffer || 0);
            const salePrice = product.regularPrice * (1 - maxOffer / 100);
            return { ...product._doc, salePrice, maxOffer };
        });
        productData.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));
        productData = productData.slice(0, 4);

        if (user) {
            const userData = await User.findById(user);
            return res.render("home", {
                user: userData,
                products: productData,
                banner: findBanner || [],
            });
        } else {
            return res.render("home", {
                products: productData,
                banner: findBanner || [],
            });
        }
    } catch (error) {
        console.log('home page not working');
        res.status(500).send("server error");
    }
};

const loadSignup = async (req, res) => {
    try {
        // CHANGE: Pass referralCode from query if present
        const referralCode = req.query.referralCode || '';
        return res.render('signup', { message: null, referralCode });
    } catch (error) {
        console.log("home page not loading");
        res.status(500).send("server Error");
    }
};

function genarateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

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
            },
        });

        const mailOption = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`,
            html: `<b><h4>Your OTP : ${otp}</h4><br></b>`,
        };

        const info = await transporter.sendMail(mailOption);
        console.log("Email sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("error sending email", error);
        return false;
    }
};
const signup = async (req, res) => {
    try {
        const { name, email, password, Cpassword, referralCode } = req.body;
        if (password !== Cpassword) {
            return res.render("signup", { message: "Password do not match", referralCode });
        }

        if (referralCode) {
            const referrer = await User.findOne({ referralCode });
            if (!referrer) {
                return res.render("signup", { message: "Invalid referral code", referralCode });
            }
        }

        const otp = genarateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.render("signup", { message: "Failed to send OTP", referralCode });
        }

        req.session.userOtp = otp;
        req.session.userData = { name, email, password, referralCode };
        res.render("verify-otp");
        console.log("OTP send", otp);
    } catch (error) {
        console.log("signup error", error);
        res.redirect("/pageNotFound");
    }
};


const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        throw error;
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        if (!otp || typeof otp !== 'string' || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP format. Please provide a 6-digit number.'
            });
        }

        if (!req.session.userOtp) {
            return res.status(401).json({
                success: false,
                message: 'Session expired or invalid. Please request a new OTP.'
            });
        }

        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            if (!user.name || !user.email || !user.password) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user data in session.'
                });
            }

            const passwordHash = await securePassword(user.password);
            const referralCode = await generateReferralCode();
            let redeemedUser = [];
            let availableCoupons = [];

            if (user.referralCode) {
                const referrer = await User.findOne({ referralCode: user.referralCode });
                if (referrer) {
                    redeemedUser = [referrer._id];
                    // Generate coupon for referrer
                    const referrerCoupon = new Coupon({
                        name: 'REF' + Math.random().toString(36).substr(2, 8).toUpperCase(),
                        offerPrice: 100,
                        minimumPrice: 500,
                        expireOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                        isList: true
                    });
                    await referrerCoupon.save();
                    if (!referrer.availableCoupons) referrer.availableCoupons = [];
                    referrer.availableCoupons.push(referrerCoupon._id);
                    await referrer.save();

                    // Generate coupon for referee (new user)
                    const refereeCoupon = new Coupon({
                        name: 'NEW' + Math.random().toString(36).substr(2, 8).toUpperCase(),
                        offerPrice: 50,
                        minimumPrice: 300,
                        expireOn: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                        isList: true
                    });
                    await refereeCoupon.save();
                    availableCoupons.push(refereeCoupon._id);
                }
            }

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                password: passwordHash,
                isVerified: true,
                createdOn: new Date(),
                referralCode,
                redeemedUser,
                availableCoupons
            });

            const savedUser = await saveUserData.save();
            req.session.user = savedUser._id;
            req.session.userOtp = null;
            req.session.userData = null;

            return res.status(200).json({
                success: true,
                message: 'OTP verified successfully. Account created.',
                redirectUrl: '/'
            });
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

const resendOtp = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: "OTP Resend error, email not found" });
        }
        const otp = genarateOtp();
        const emailSent = await sendVerificationEmail(email, otp);
        req.session.userOtp = otp;

        if (emailSent) {
            console.log("Resend otp", otp);
            res.status(200).json({ success: true, message: "OTP Resend successfully" });
        } else {
            res.status(500).json({ success: false, message: "Failed to resend otp. please try again" });
        }
    } catch (error) {
        console.log("error resending OTP", error);
        res.status(500).json({ success: false, message: "Internal server error, please try again later" });
    }
};

const loadLogin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.render("login", { message: null });
        } else {
            res.redirect("/");
        }
    } catch (error) {
        res.redirect("/pageNotFound");
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ email: email });

        if (!findUser) {
            return res.render("login", { message: "User not found" });
        }
        if (findUser.isBlocked) {
            return res.render("login", { message: "User is blocked by admin" });
        }
        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect password" });
        }
        req.session.user = findUser._id;
        res.redirect("/");
    } catch (error) {
        console.log("login error", error);
        res.render("login", { message: "login failed. please try again later" });
    }
};



const loadShopping = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = userId ? await User.findById(userId) : null;
        const categories = await Category.find({ isListed: true });
        const { sort, search, category, minPrice, maxPrice, skip = 0 } = req.query;
        let productQuery = { isBlocked: false, status: 'Available' };

        // Search filter
        if (search) {
            productQuery.productName = { $regex: search, $options: 'i' };
        }

        // Category filter
        if (category) {
            productQuery.category = category;
        }

        // Price range filter
        if (minPrice || maxPrice) {
            const salePriceQuery = {};
            if (minPrice) {
                salePriceQuery.$gte = parseFloat(minPrice);
            }
            if (maxPrice) {
                salePriceQuery.$lte = parseFloat(maxPrice);
            }
            // Fetch products to calculate salePrice dynamically
            productQuery.$expr = {
                $and: [
                    minPrice ? { $gte: [{ $multiply: ['$regularPrice', { $subtract: [1, { $divide: [{ $max: ['$productOffer', '$category.categoryOffer'] }, 100] }] }] }, parseFloat(minPrice)] } : {},
                    maxPrice ? { $lte: [{ $multiply: ['$regularPrice', { $subtract: [1, { $divide: [{ $max: ['$productOffer', '$category.categoryOffer'] }, 100] }] }] }, parseFloat(maxPrice)] } : {}
                ].filter(Boolean)
            };
        }

        // Sorting options
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
                break;
            case 'zToA':
                sortOption = { productName: -1 };
                break;
            case 'newArrivals':
                sortOption = { createdAt: -1 };
                break;
            default:
                sortOption = { createdAt: -1 };
        }

        const limit = 12;
        // const products = await Product.find(productQuery)
        //     .populate('category')
        //     .sort(sortOption)
        //     .skip(parseInt(skip))
        //     .limit(limit);
        const products = await Product.find(productQuery)
        .populate('category')
        .sort(sortOption)
        .skip(parseInt(skip))
        .limit(limit);

        // Calculate salePrice and maxOffer
        const productsWithOffers = products.map(product => {
            const categoryOffer = product.category?.categoryOffer || 0;
            const productOffer = product.productOffer || 0;
            const maxOffer = Math.max(productOffer, categoryOffer);
            const salePrice = product.regularPrice * (1 - maxOffer / 100);
            return {
                ...product._doc,
                salePrice,
                maxOffer,
                hasOffer: maxOffer > 0,
            };
        });

        // Sort products client-side for price-based sorting
        if (sort === 'lowToHigh' || sort === 'highToLow') {
            productsWithOffers.sort((a, b) => {
                return sort === 'lowToHigh' ? a.salePrice - b.salePrice : b.salePrice - a.salePrice;
            });
        }

        const totalProducts = await Product.countDocuments(productQuery);
        const hasMore = parseInt(skip) + limit < totalProducts;
        console.log("its abbout product:",products)

        return res.render('shop', {
            products: productsWithOffers,
            userData,
            categories,
            sort: sort || '',
            search: search || '',
            category: category || '',
            minPrice: minPrice || '',
            maxPrice: maxPrice || '',
            skip: parseInt(skip),
            hasMore,
            totalProducts,
            
        });
    } catch (error) {
        console.error('Error loading shopping page with filters:', error);
        return res.status(500).render('page-404', { message: 'Server Error' });
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
};


