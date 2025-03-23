const Banner = require("../../models/bannerSchema")
const path = require("path");
const fs = require("fs")

// Function to load the banner page and retrieve all banners from the database

const getBannerPage = async (req, res) => {
    try {

        const findBanner = await Banner.find({})
        res.render("banner", { data: findBanner })


    } catch (error) {
        res.redirect("/pageError")

    }
}
// Function to load the 'add banner' page

const getAddBannerPage = async (req, res) => {
    try {
        res.render("addBanner")

    } catch (error) {
        res.redirect("/pageError")

    }
}

// Function to handle adding a new banner to the database


const addBanner = async (req, res) => {
    try {
        const data = req.body;
        const image = req.file;

        // Create a new banner document and save it to the database
        const newBanner = new Banner({
            image: image.filename,
            title: data.description,
            startDate: new Date(data.startDate + "T00:00:00"),
            endDate: new Date(data.endDate + "T00:00:00"),
            link: data.link,
        })
        // Save the new banner document to the database and log it

        await newBanner.save().then((data) => console.log(data))
        res.redirect("/admin/banner")
    } catch (error) {
        console.log(error)
        res.redirect("/admin/pageError")

    }
}

// delete banner with given id
const deleteBanner = async (req, res) => {
    try {
        const id = req.query.id;
        await Banner.deleteOne({ _id: id }).then((data) => console.log(data))
        res.redirect("/admin/banner")
    } catch (error) {
        res.redirect("/admin/pageError")
    }
}


module.exports = {
    getBannerPage,
    getAddBannerPage,
    addBanner,
    deleteBanner,

}