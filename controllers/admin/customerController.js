const User = require("../../models/userSchema")
const { search } = require("../../routes/adminRouter")

// Function to fetch customer info with pagination and search filter
const customerInfo = async (req, res) => {
    try {
        let search = req.query.search || ''; 
        let page = parseInt(req.query.page) || 1; 
        const limit = 3; 

        // Query to filter users by name or email based on search term
        const query = {
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: 'i' } },
                { email: { $regex: ".*" + search + ".*", $options: 'i' } }
            ]
        };

        // Fetch user data based on the query, sorted by creation date
        const userData = await User.find(query)
            .sort({ createdOn: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec()

        // Get the total number of matching users
        const count = await User.countDocuments(query);
        const totalPages = Math.ceil(count / limit); // Calculate total pages for pagination

        // Ensure valid page number
        if (page < 1 || page > totalPages) {
            page = 1;
        }

        // Render customer page with data and pagination info
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

// Function to block a customer
const customerBlocked = async (req, res) => {
    try {
        let id = req.query.id; 
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } }); 
        res.redirect("/admin/users"); 
    } catch (error) {
        res.redirect("/pageError");
    }
}

// Function to unblock a customer
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
