
const express = require("express")
const app = express()
const path = require("path")
const session = require("express-session")
const passport = require("./config/passport")
const userRouter = require("./routes/userRouter")
const env = require("dotenv").config()
const db = require("./config/db")
db()
const adminRouter = require("./routes/adminRouter")

// Session management configuration

app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))
// Initialize Passport for handling authentication and session management


app.use(passport.initialize())
app.use(passport.session())
// Setting up EJS as the template engine for rendering views

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,"views/user"),path.join(__dirname,"views/admin")])
app.use(express.static(path.join(__dirname,"public")))
// define route for user and admin

app.use("/",userRouter);
app.use("/admin",adminRouter)


// 🚫 No Cache Middleware
const noCache = (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache'); 
    res.set('Expires', '0');
    next();
  };
  app.use(noCache); 
  


// server start
app.listen(process.env.PORT,()=>{
    console.log(" server working",
        "http://localhost:9000"
    )
})


module.exports = app;