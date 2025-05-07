const Coupon = require("../../models/couponSchema");
const User = require("../../models/userSchema");


const getMyCouponsPage = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect("/login");
        }

        // Fetch active coupons
        const coupons = await Coupon.find({
            isList: true,
            expireOn: { $gte: new Date() }
        }).lean();

        // Add usage status
        const user = await User.findById(userId).lean();
        const usedCoupons = user.usedCoupons || []; 
        coupons.forEach(coupon => {
            const isUsed = usedCoupons.includes(coupon._id.toString());
            coupon.isUsed = isUsed;
            coupon.usageMessage = isUsed ? "Coupon Used" : "Available";
        });

        res.render("mycoupons", { coupons });
    } catch (error) {
        console.error("Error in getMyCouponsPage:", error);
        res.status(500).send("Server error");
    }
};

module.exports = { getMyCouponsPage };