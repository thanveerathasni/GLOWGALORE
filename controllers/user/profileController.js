const User = require("../../models/userSchema")

const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt")
const env = require("dotenv").config()
const session = require("express-session")


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
                console.log("passwordHashy:", passwordHashy)
                await User.updateOne({ email: email }, { $set: { password: passwordHashy } })
                res.redirect("/login")
            } else {
                res.render("reset-password", { message: "passwords do not match " })
            }
        }
        else {
            res.send('hlo...')
        }

    } catch (error) {
        res.redirect("/pageNotFound")

    }
}


module.exports = {
    getForgetPassword,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassword,
    resendOtp,
    postNewPassword,
};