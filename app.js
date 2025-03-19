
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

app.use(passport.initialize())
app.use(passport.session())

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,"views/user"),path.join(__dirname,"views/admin")])
app.use(express.static(path.join(__dirname,"public")))


app.use("/",userRouter);
app.use("/admin",adminRouter)

app.listen(process.env.PORT,()=>{
    console.log(" server working",
        "http://localhost:9000"
    )
})


module.exports = app;