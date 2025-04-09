const user = require("../../models/userSchema")
const mongoose = require("mongoose")
const bycrypt = require("bcrypt")
const User = require("../../models/userSchema")
const Category = require("../../models/categorySchema")


// Load the login page if the user is not already logged in as an admin
const loadLogin = (req, res) => {
    if (req.session.admin) {
        return res.redirect("/admin/dashboard")
    }
    res.render("admin-login", { message: null })
}
// Handle login logic


const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });
        if (admin) {
            const passwordMatch = bycrypt.compare(password, admin.password);
            if (passwordMatch) {
                req.session.admin = true;
                return res.redirect("/admin")//dashboard
            } else {
                return res.redirect("/admin/login")
            }

        } else {
            return res.redirect("/admin/login")
        }
    } catch (error) {
        console.log("log error", error)
        return res.redirect("/pageError")

    }
}

// Load the admin dashboard if the user is logged in

const loadDashboard = async (req, res) => {
    try {
        if (req.session.admin) {
            res.render("admin-dashboard");
        } else {
            res.redirect("/admin/login")
        }
    } catch (error) {
        res.redirect("/pageError")
    }
}


const pageError = (req, res) => {
    res.render("admin-error")
}
// Logout the user by destroying the session

const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("error distroy session", err)
                returnres.redirect("/pageError")
            }
            res.redirect("/admin/login")
        })
    } catch (error) {
        console.log("unexpected error during logout", error)
        res.redirect("/pageError")
    }

}




module.exports = {
    loadLogin,
    login,
    loadDashboard,
    pageError,
    logout,

}