const User = require("../../models/userSchema")
const Address = require("../../models/addressSchema")
const Coupon = require("../../models/couponSchema")

const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt")
const env = require("dotenv").config()
const session = require("express-session")
const path = require('path');
const fs = require('fs');

// Function to generate a random OTP

function generateOtp() {
    const digits = "1234567890";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];  // Fixed this line
    }
    return otp;
}


// Send OTP verification email

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
        console.log("error sent in email", error)
        return false;


    }

}
// Secure the password by hashing

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        console.log("passwordHash:", passwordHash)
        return passwordHash;
    } catch (error) {
        // Handle errors silently

    }
}

// Render forgot password page

const getForgetPassword = async (req, res) => {
    try {
        res.render("forgot-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

// Validate email for password reset

const forgotEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const findUser = await User.findOne({ email: email })
        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                console.log("Email set in session:", req.session.email);

                res.render("forgotPass-otp")
                console.log("OTP:", otp);
            } else {
                res.json({ success: false, message: "Failed to send otp ,please try again later" })

            }
        } else {
            res.render("forgot-password", {
                message: "User with this email does not exist"
            })
        }
    } catch (error) {
        res.redirect("/pageNotFound")

    }
}
// Verify the OTP entered by the user

const verifyForgotPassOtp = async (req, res) => {
    try {
        console.log(req.session.email)
        const enteredOtp = req.body.otp;
        console.log(enteredOtp)
        if (enteredOtp === req.session.userOtp) {
            res.json({ success: true, redirectUrl: "/reset-password" })
        } else {
            res.json({ success: false, message: "OTP not matching" })
        }
    } catch (error) {

        res.status(500).json({ success: false, message: "an error occured in otp " })

    }
}
// Render reset password page

const getResetPassword = async (req, res) => {
    try {
        res.render("reset-password")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}
// Resend OTP if needed

const resendOtp = async (req, res) => {
    try {
        const otp = generateOtp()
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("resend email is ", email)
        const emailSent = await sendVerificationEmail(email, otp)
        if (emailSent) {
            console.log("Resend Otp", otp)
            res.status(200).json({ success: true, message: "Resend OTP successful" })
        }
    } catch (error) {
        console.log("error in resend otp", error)
        res.status(500).json({ success: false, message: "Internal server error " })

    }
}
// Post the new password after verification

const postNewPassword = async (req, res) => {
    try {
        const { newPass1, newPass2 } = req.body;
        const email = req.session.email;


        if (email) {
            if (newPass1 === newPass2) {
                const passwordHashy = await securePassword(newPass1);
                await User.updateOne({ email: email }, { $set: { password: passwordHashy } })
                res.redirect("/login")
            } else {
                res.render("reset-password", { message: "passwords do not match " })
            }
        }
        else {
            res.redirect("/pageNotFound")

        }

    } catch (error) {
        res.redirect("/pageNotFound")

    }
}

const userProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId)
        const addressData = await Address.findOne({ userId: userId })

        res.render("userProfile", {
            user: userData,
            userAddress: addressData,
        })
    } catch (error) {
        console.log("error while seting profile", error)
        res.redirect("/pageNotFound")
    }
}

const changeEmail = async (req, res) => {
    try {
        res.render("change-email")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const changeEmailValid = async (req, res) => {
    try {
        const { email } = req.body;
        const userExists = await User.findOne({ email })
        if (userExists) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.userData = req.body
                req.session.email = email;
                res.render("change-email-otp")
                console.log("Email sent:", email)
                console.log("OTP: ", otp);
            } else {
                res.json("email-error")
            }
        } else {
            res.render("change-email", {
                message: "User with this email not exist"
            })
        }
    }
    catch (error) {
        res.redirect("/pageNotFound")

    }
}



const verifyEmailOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        if (enteredOtp === req.session.userOtp) {
            req.session.userData = req.body.userData;
            res.render("new-email", {
                userData: req.session.userData,
            })
        } else {
            res.render("change-email-otp", {
                message: "OTP not matching",
                userData: req.session.userData
            })
        }
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}
const updateEmail = async (req, res) => {
    try {
        const newEmail = req.body.newEmail;
        const userId = req.session.user;
        await User.findByIdAndUpdate(userId, { email: newEmail });
        res.redirect("/dashboard")
    } catch (error) {
        I
        res.redirect("/pageNotFound")
    }
}

const changePassword = async (req, res) => {
    try {
        res.render("change-password")
    } catch (error) {
        res.redirect("/pageNoFound");
    }
}

const changePasswordValid = async (req, res) => {
    try {
        const { email } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) {
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email, otp);
            if (emailSent) {

                req.session.userOtp = otp;
                req.session.userData = req.body;
                req.session.email = email;
                res.render("change-password-otp");
                console.log('OTP: ', otp);
            } else {
                res.json({
                    success: false,
                    message: "failed to send otp, please try again later"
                })
            }
        } else {
            res.render("change-password", {
                message: "user with this email doesnot exist"
            })
        }
    } catch (error) {
        console.log("error in change password validation,", error)
        res.redirect("/pageNotFound")
    }
}

const verifyChangePassOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp;
        if (enteredOtp === req.session.userOtp) {
            res.json({ success: true, redirectUrl: "/reset-password" })
        } else {
            res.json({
                success: false,
                message: "otp not matching",
            }
            )
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "error occured", error
        })
    }
}

const addAddress = async (req, res) => {
    try {
        const user = req.session.user;
        res.render("add-address", { user: user })
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const postAddAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId });
        const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
        const userAddress = await Address.findOne({ userId: userData._id });
        if (!userAddress) {
            const newAddress = new Address({
                userId: userData._id,
                address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }]
            });
            await newAddress.save();
        } else {
            userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone })
            await userAddress.save()
        }
        res.redirect("/dashboard")
    } catch (error) {
        console.log("error while adding address", error)
        res.redirect("/pageNotFound")
    }
};

const myAddress = async (req, res) => {
    try {

        const userId = req.session.user;
        const userData = await User.findById(userId)
        const addressData = await Address.findOne({ userId: userId })
        
        res.render("address", {
            user: userData,
            userAddress: addressData,
        })



    } catch (error) {
        res.redirect("/pageNotFound")
    }
}
const editAddress = async (req, res) => {
    try {

        const userId = req.session.user;
        const userData = await User.findById(userId)
        const addressData = await Address.findOne({ userId: userId })
        
        res.render("edit-address", {
            user: userData,
            userAddress: addressData,
        })



    } catch (error) {
        res.redirect("/pageNotFound")
    }
}




const editAddressById = async (req, res) => {
    try {
        const addressId = req.params.addressId; // Get the address ID from the URL
        const data = req.body; // Get the data from the form
        const userId = req.session.user; // Get the user ID from the session

        // Find the user's address document
        const userAddress = await Address.findOne({ userId: userId });
        if (!userAddress) {
            return res.redirect("/pageNotFound"); // If no address found for the user
        }

        // Find the index of the address with the provided addressId
        const addressIndex = userAddress.address.findIndex((addr) => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.redirect("/pageNotFound"); // Address not found
        }

        // Update the address at the found index
        userAddress.address[addressIndex] = {
            ...userAddress.address[addressIndex], // Keep existing data
            addressType: data.addressType,
            name: data.name,
            city: data.city,
            landMark: data.landMark,
            state: data.state,
            pincode: data.pincode,
            phone: data.phone,
            altPhone: data.altPhone
        };

        // Save the updated address document
        await userAddress.save();

        res.redirect("/address"); // Redirect to the address page after update

    } catch (error) {
        console.log("Error while updating address: ", error);
        res.redirect("/pageNotFound"); // Handle error
    }
};


const deleteAddress = async (req,res) => {
    try {
        
        const addressId = req.query.id;
        const findAddress = await Address.findOne({"address._id":addressId})

        if(!findAddress){
            return res.status(404).send("Address Not Found")
        }

        await Address.updateOne(
        {
            "address._id":addressId
        },
        {
            $pull: {
                address:{
                    _id:addressId,
                }
            }
        })

        res.redirect("/address")
    } catch (error) {

        console.error("Error in deleting in address",error)
        res.redirect("/pageNotFound")
        
    }

}

const editProfile = async (req, res) => {
    try {
        const userId = req.session.user
        const userData = await User.findById(userId)

        res.render("edit-profile", {
            user: userData,
        })
    } catch (error) {
        res.redirect("/pageNotFound")
        console.log("error while rendering edit page ", error)
    }
}


const getwallet = async (req, res) => {
    try {
        const userId = req.session.user
        const userData = await User.findById(userId)
        res.render("wallet", {
            user: userData,
        })
        
    } catch (error) {
        res.redirect("/pageNotFound")
        console.log("error while rendering edit page ", error)
    }
}


const updateProfileImage = async (req, res) => {
    try {
        const userId = req.session.user;

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image uploaded"
            });
        }

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Remove existing profile image if it exists
        if (user.profileImage) {
            try {
                const oldImagePath = path.join(__dirname, '../../public', user.profileImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            } catch (fileError) {
                console.error("Error deleting old profile image:", fileError);
            }
        }

        // Generate new image path
        const imagePath = `/uploads/profiles/${req.file.filename}`;

        // Update user profile image
        user.profileImage = imagePath;
        await user.save();

        res.status(200).json({
            success: true,
            message: "Profile image updated successfully",
            imagePath: imagePath
        });

    } catch (error) {
        console.error("Profile image update error:", error);
        res.status(500).json({
            success: false,
            message: "Error updating profile image"
        });
    }
};


//  const getCoupons = async (req, res) => {
//     try {
//         const user = await User.findById(req.session.user).populate('usedCoupons').populate('availableCoupons');
//         if (!user) {
//             return res.redirect('/login');
//         }
//         const allCoupons = [...user.usedCoupons, ...user.availableCoupons];
//         res.render('coupon', { user, coupons: allCoupons });
//     } catch (error) {
//         console.error(error);
//         res.status(500).render('page-404', { message: 'Server Error' });
//     }
// };
const getCoupons = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.redirect('/login');
        }

        // Fetch all active coupons, similar to getMyCouponsPage
        const coupons = await Coupon.find({
            isList: true,
            expireOn: { $gte: new Date() }
        }).lean();

        // Fetch the user to get usedCoupons for status
        const user = await User.findById(userId).lean();
        const usedCoupons = user.usedCoupons || [];

        // Add usage status for each coupon, matching getMyCouponsPage behavior
        coupons.forEach(coupon => {
            const isUsed = usedCoupons.some(u => u.toString() === coupon._id.toString());
            coupon.isUsed = isUsed;
            coupon.usageMessage = isUsed ? "Coupon Used" : "Available";
        });

        // Render with all active coupons and user context
        res.render('coupon', { user, coupons });
    } catch (error) {
        console.error("Error in getCoupons:", error);
        res.status(500).render('page-404', { message: 'Server Error' });
    }
};


module.exports = {
    getForgetPassword,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassword,
    resendOtp,
    postNewPassword,
    userProfile,
    changeEmail,
    changeEmailValid,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid,
    verifyChangePassOtp,
    myAddress,
    addAddress,
    editProfile,
    updateProfileImage,
    editAddress,
    postAddAddress,
    editAddressById,
    deleteAddress,
    getwallet,
    getCoupons,
};