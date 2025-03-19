const User = require("../../models/userSchema")
const nodemailer = require("nodemailer")
const env = require("dotenv").config()
const bcrypt = require("bcrypt")

const pageNotFound = async (req, res) => {
    try {

        res.render("page-404")
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}
const logout = async (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("session destruction error",err.message)
                return res.redirect("/pageNotFound")
            }
            return res.redirect("/login")
        })
    } catch (error) {
        console.log("Logout error",error)
        res.redirect("/pageNotFound")
        
    }
}




const loadHomepage = async (req, res) => {
    try {
        const user = req.session.user;
        console.log("user:",user)
        if(user){
            const userData = await User.findById(user)
            res.render("home",{user:userData})

        }else{
            return res.render("home")
        }




    } catch (error) {
        console.log('home page not working')
        res.status(500).send("server error")
    }
}

const loadSignup = async (req, res) => {
    try {
        return res.render('signup');
    } catch (error) {
        console.log("home page not loading")
        res.status(500).send("server Error")
    }
}

const loadShopping = async (req, res) => {
    try {
        return res.render('shop');
    } catch (error) {
        console.log("shopping page not loading")
        res.status(500).send("server Error")
    }

}

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

        console.error("error sending email", error);
        return false

    }
}



const signup = async (req, res) => {
    try {
        const { name, email, password, Cpassword } = req.body;
        if (password !== Cpassword) {
            return res.render("signup", { message: "Password do not match" });
        }

        const otp = genarateOtp();
        const emailSent = await sendVerificationEmail(email, otp)
        //console.log("emailSent doneeeee", emailSent)
        if (!emailSent) {
            return res.json("email.error heree the problem")
        }

        req.session.userOtp = otp;
        console.log("req.session.userOtp:",req.session.userOtp)
        req.session.userData = { name, email, password }

        res.render("verify-otp")
        console.log("OTP send", otp)
    } catch (error) {
        console.log("signup error", error)
        res.redirect("/pageNotFound")

    }
}

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash;
    } catch (error) {

    }
}


const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        // Input validation
        if (!otp || typeof otp !== 'string' || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP format. Please provide a 6-digit number.'
            });
        }

        // Check if session data exists
        if ( !req.session.userOtp ) {
            return res.status(401).json({
                success: false,
                message: 'Session expired or invalid. Please request a new OTP.'
            });
        }

        // Verify OTP
        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            
            // Validate user data
            if (!user.name || !user.email || !user.password) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user data in session.'
                });
            }

            // Hash password
            const passwordHash = await securePassword(user.password);


            // Create and save new user
            const saveUserData = new User({
                name: user.name,
                email: user.email,
                password: passwordHash,
                isVerified: true, // Add verification status
                createdAt: new Date()
            });

            const savedUser = await saveUserData.save();

            // Update session
            req.session.user = savedUser._id;
            req.session.userOtp = null; // Clear OTP after successful verification
            req.session.userData = null; // Clear temporary user data

            return res.status(200).json({
                success: true,
                message: 'OTP verified successfully. Account created.',
                redirectUrl:'/'            });
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

const resendOtp = async(req,res)=>{
    try{
        const {email}= req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"OTP Resend error , email not found"})

        }
        const otp = genarateOtp();
        const emailSent = await sendVerificationEmail(email, otp)

        if(emailSent){
            console.log("Resend otp",otp)
            res.status(200).json({success:true,message:"OTP Resend successfully"})
        }else{
            res.status(500).json({success:false,message:"Failed to resend otp. please try again"})

        }
    }catch(error){
        console.log("error resending OTP", error)
        res.status(500).json({success:false,message:"Internal server error, please try again later"})
    }
   
}


const loadLogin = async (req,res)=>{
    try {
        if(!req.session.user){
            
            return res.render("login",{message:null})
        }else{
            res.redirect("/")
        }
        
    } catch (error) {
        res.redirect("/pageNotFound")
        
    }
}

const login = async (req,res)=>{
    try {
        const {email,password}= req.body;
        const findUser = await User.findOne({isAdmin:0,email:email});

        if(!findUser){
            return res.render("login",{message:"User not found"})
        }
        if(findUser.isBlocked){
            return res.render("login",{message:"User is blocked by admin"})
            
        }
        //console.log("haaai",findUser )
        const passwordMatch = await bcrypt.compare(password,findUser.password);
        if(!passwordMatch){
            return res.render("login",{message:"Incorrect password"})
        }
        req.session.user = findUser._id;
        res.redirect("/")

    } catch (error) {
        console.log("login error",error)
        res.render("login",{message:"login failed .  please try again later"})
    }
}

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


}