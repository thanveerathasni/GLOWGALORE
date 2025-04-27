const User = require("../models/userSchema")
const user = require("../models/userSchema")

// User authentication middleware

const userAuth = (req,res,next)=>{
     // Prevent browser caching
     res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
     res.setHeader("Pragma", "no-cache");
     res.setHeader("Expires", "0");
    if(req.session.user){
        User.findById(req.session.user)
        .then(data=>{
            if(data && !data.isBlocked){
                next();
            }else{
                res.redirect("/login")
            }
        })
        .catch(error=>{
            console.log("Error in user auth middleware")
            res.status(500).send("internal server error")
        })
    }else{
        res.redirect("/login")
    }
}

// Admin authentication middleware

const adminAuth = (req,res,next)=>{
    User.findOne({isAdmin:true})
    .then(data=>{
        if(data){
            next()
        }else{
            res.redirect("/admin/login")
        }
    })
    .catch(error=>{
        console.log("error in admin Auth middleware")
        res.status(500).send("Internal server error")
    })
}

const ajaxAuth = (req, res, next) => {
    if (req.session.user) {
      User.findById(req.session.user)
        .then((user) => {
          if (user && !user.isBlocked) {
            next();
          } else {
            delete req.session.user;
            res.status(401).json({ 
              status: false, 
              message: "User is blocked or not found" 
            });
          }
        })
        .catch((error) => {
          console.log("Ajax Auth Error", error);
          res.status(500).json({ 
            status: false, 
            message: "Internal server error" 
          });
        });
    } else {
      res.status(401).json({ 
        status: false, 
        message: "User not logged in" 
      });
    }
  };
  
  

module.exports={
    userAuth,
    adminAuth,
    ajaxAuth,
}