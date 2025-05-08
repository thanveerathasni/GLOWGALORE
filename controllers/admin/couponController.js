const Coupon = require("../../models/couponSchema")
const mongoose = require("mongoose")



const loadCoupon = async (req, res) => {
    try {
        const findCoupons = await Coupon.find({}).sort({ createdOn: -1 });
        return res.render("coupons", {
            coupons: findCoupons,
            successMessage: req.query.success || '',
            errorMessage: req.query.error || ''
        });
    } catch (error) {
        return res.redirect("/pageerror");
    }
};

const createCoupon = async (req, res) => {
    try {
        const { couponName, startDate, endDate, offerPrice, minimumPrice } = req.body;

        // Validate inputs
        if (!couponName || !startDate || !endDate || !offerPrice || !minimumPrice) {
            return res.redirect(`/admin/coupon?error=${encodeURIComponent('All fields are required')}`);
        }

        const nameRegex = /^[A-Za-z0-9]{1,50}$/;
        if (!nameRegex.test(couponName)) {
            return res.redirect(`/admin/coupon?error=${encodeURIComponent('Invalid coupon name')}`);
        }

        // Check for duplicate coupon (case-insensitive)
        const existingCoupon = await Coupon.findOne({
            name: { $regex: '^' + couponName.trim() + '$', $options: 'i' }
        });
        if (existingCoupon) {
            return res.redirect(`/admin/coupon?error=${encodeURIComponent('Coupon already exists')}`);
        }

        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDateObj > endDateObj) {
            return res.redirect(`/admin/coupon?error=${encodeURIComponent('End date must be after start date')}`);
        }

        if (startDateObj < today) {
            return res.redirect(`/admin/coupon?error=${encodeURIComponent('Start date must be today or later')}`);
        }

        const offerPriceNum = parseInt(offerPrice);
        const minimumPriceNum = parseInt(minimumPrice);

        if (isNaN(offerPriceNum) || isNaN(minimumPriceNum)) {
            return res.redirect(`/admin/coupon?error=${encodeURIComponent('Offer price and minimum price must be numeric')}`);
        }

        if (offerPriceNum <= 10) {
            return res.redirect(`/admin/coupon?error=${encodeURIComponent('Offer price must be above 10 rupees')}`);
        }

        if (offerPriceNum >= minimumPriceNum) {
            return res.redirect(`/admin/coupon?error=${encodeURIComponent('Offer price must be less than minimum price')}`);
        }

            const uppercaseName = couponName.toUpperCase()


        // Create new coupon
        const coupon = new Coupon({
            name: uppercaseName,
            createdOn: startDateObj,
            expireOn: endDateObj,
            offerPrice: offerPriceNum,
            minimumPrice: minimumPriceNum,
            isList: true
        });

        await coupon.save();
        res.redirect(`/admin/coupon?success=${encodeURIComponent('Coupon created successfully')}`);
    } catch (error) {
        console.error('Error creating coupon:', error);
        res.redirect(`/admin/coupon?error=${encodeURIComponent('Server error')}`);
    }
};




// const loadCoupon = async (req,res) => {
//     try {

//         const findCoupons = await Coupon.find({}).sort({createdOn:-1})
        

//         return res.render("coupons",{coupons:findCoupons})

//     } catch (error) {
//         return res.redirect("/pageerror")
        
//     }
// }
// // Create a new coupon
// const createCoupon = async (req, res) => {
//     try {
//       const { couponName, startDate, endDate, offerPrice, minimumPrice } = req.body;
  
//       // Validate inputs
//       if (!couponName || !startDate || !endDate || !offerPrice || !minimumPrice) {
//         return res.status(400).json({ status: false, message: 'All fields are required' });
//       }
  
//       const nameRegex = /^[A-Za-z0-9]{1,50}$/;
//       if (!nameRegex.test(couponName)) {
//         return res.status(400).json({ status: false, message: 'Invalid coupon name' });
//       }
  
//       const startDateObj = new Date(startDate);
//       const endDateObj = new Date(endDate);
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);
  
//       if (startDateObj > endDateObj) {
//         return res.status(400).json({ status: false, message: 'End date must be after start date' });
//       }
  
//       if (startDateObj <= today) {
//         return res.status(400).json({ status: false, message: 'Start date must be today or later' });
//       }
  
//       const offerPriceNum = parseInt(offerPrice);
//       const minimumPriceNum = parseInt(minimumPrice);
  
//       if (isNaN(offerPriceNum) || isNaN(minimumPriceNum) || offerPriceNum >= minimumPriceNum) {
//         return res.status(400).json({ status: false, message: 'Offer price must be less than minimum price' });
//       }
  
//       // Create new coupon
//       const coupon = new Coupon({
//         name: couponName,
//         createdOn: new Date(),
//         expireOn: endDateObj,
//         offerPrice: offerPriceNum,
//         minimumPrice: minimumPriceNum,
//         isList: true // Default to active
//       });
  
//       await coupon.save();
  
//       // Redirect to the banner/coupon page
//       res.redirect('/admin/coupon'); // Adjust to your actual route for the banner page
//     } catch (error) {
//       console.error('Error creating coupon:', error);
//       res.status(500).json({ status: false, message: 'Server error' });
//     }
//   };
const editCoupon = async (req,res) => {
    try {

        const id = req.query.id;
        const findCoupon = await Coupon.findOne({_id:id});

        res.render("edit-coupon",{
            findCoupon:findCoupon,

        })
        
    } catch (error) {

        res.redirect("/pageerror")
        
    }
}

const updateCoupon = async (req, res) => {
    try {
        const couponId = req.query.couponId;
        if (!mongoose.Types.ObjectId.isValid(couponId)) {
            return res.status(400).json({ message: "Invalid coupon ID" });
        }

        const oid = new mongoose.Types.ObjectId(couponId);
        const selectedCoupon = await Coupon.findOne({ _id: oid });

        if (!selectedCoupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        const startDate = new Date(req.body.startDate + "T00:00:00");
        const endDate = new Date(req.body.endDate + "T00:00:00");

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            { _id: oid },
            {
                $set: {
                    name: req.body.couponName,
                    createdOn: startDate,
                    expireOn: endDate,
                    offerPrice: parseInt(req.body.offerPrice),
                    minimumPrice: parseInt(req.body.minimumPrice)
                }
            },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(500).json({ message: "Error updating coupon" });
        }

        res.json({ message: "Coupon updated successfully", coupon: updatedCoupon });
    } catch (error) {
        console.error("Error updating coupon:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const deleteCoupon = async (req,res) => {
    try {
        
        const id = req.query.id;
        await Coupon.deleteOne({_id:id})
        res.status(200).send({success:true,message:"Coupon deleted successfully"})

    } catch (error) {
        console.error("Error Deleting Coupon",error)
        res.status(500).send({success:false,message:"Internal Server Error"})
    }
}


module.exports = {
    loadCoupon,
    createCoupon,
    editCoupon,
    updateCoupon,
    deleteCoupon,


}