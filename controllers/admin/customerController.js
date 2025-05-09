const User = require("../../models/userSchema")
const { search } = require("../../routes/adminRouter")

const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || ''; 
        let page = parseInt(req.query.page) || 1; 
        const limit = 3; 

        const query = {
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' } },
                { email: { $regex: ".*" + search + ".*", $options: 'i' } }
            ]
        };

        const userData = await User.find(query)
            .sort({ createdOn: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec()

        const count = await User.countDocuments(query);
        const totalPages = Math.ceil(count / limit);
        if (page < 1 || page > totalPages) {
            page = 1;
        }
        res.render("customers", {
            data: userData,
            totalPages,
            currentPage: page,
            search
        });

    } catch (error) {
        console.log("Error:", error); 
        res.redirect("/pageError"); 
    }
};

const customerBlocked = async (req, res) => {
    try {
        let id = req.query.id; 
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } }); 
        res.redirect("/admin/users"); 
    } catch (error) {
        res.redirect("/pageError");
    }
}

const customerunBlocked = async (req, res) => {
    try {
        let id = req.query.id; 
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } }); 
        res.redirect("/admin/users"); 
    } catch (error) {
        res.redirect("/pageError");
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked,
}
