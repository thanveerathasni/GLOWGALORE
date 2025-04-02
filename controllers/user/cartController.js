// const mongoose = require('mongoose'); // Added mongoose import
// const Cart = require("../../models/cartSchema");
// const Product = require("../../models/productSchema");
// const User = require("../../models/userSchema");

// const getCartPage = async (req, res) => {
//     try {
//       const userId = req.session.user;
//       const user = await User.findById(userId).populate({
//         path: 'cart.productId',
//         model: 'Product',
//         populate: {
//           path: 'category',
//           model: 'Category'
//         }
//       });
  
//       if (!user) {
//         return res.status(404).send('User not found');
//       }
  
//       // Adjust cart based on current product stock, removing zero-quantity items
//       for (let i = user.cart.length - 1; i >= 0; i--) {
//         const item = user.cart[i];
//         if (item.productId && (item.productId.quantity === 0 || item.quantity > item.productId.quantity)) {
//           if (item.productId.quantity === 0) {
//             user.cart.splice(i, 1); // Remove if stock is 0
//           } else {
//             item.quantity = item.productId.quantity; // Adjust to available stock
//           }
//         }
//       }
//       await user.save();

//       // Filter out blocked products, unlisted categories, or products with quantity <= 0
//       const cartItems = user.cart
//         .filter(item => 
//           item.productId && 
//           !item.productId.isBlocked && 
//           item.productId.category && 
//           item.productId.category.isListed && 
//           item.productId.quantity > 0
//         )
//         .map(item => ({
//           product: item.productId,
//           quantity: item.quantity,
//           totalPrice: item.productId.salePrice * item.quantity
//         }));

//       const grandTotal = cartItems.reduce((total, item) => total + item.totalPrice, 0);
// // console.log(cartItems.product.productImage[0])
//       res.render("cart", {
//         user,
//         cartItems,
//         grandTotal
//       });
//     } catch (error) {
//       console.error('Error in getCartPage:', error);
//       res.status(500).send('An error occurred while loading the cart');
//     }
// };

// const addToCart = async (req, res) => {
//     try {
//       const productId = req.body.productId;
//       const userId = req.session.user;

//       // Validate inputs
//       if (!userId || !productId) {
//         return res.status(400).json({ status: false, message: "Invalid user or product ID" });
//       }

//       // Ensure userId and productId are valid MongoDB ObjectIds using mongoose
//       if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
//         return res.status(400).json({ status: false, message: "Invalid user or product ID format" });
//       }

//       const user = await User.findById(userId);
//       if (!user) {
//         return res.status(404).json({ status: false, message: "User not found" });
//       }

//       const product = await Product.findById(productId);
//       if (!product) {
//         return res.status(404).json({ status: false, message: "Product not found" });
//       }
  
//       if (product.quantity <= 0) {
//         return res.status(400).json({ status: false, message: "Product is out of stock" });
//       }
  
//       const cartItemIndex = user.cart.findIndex(item => item.productId.toString() === productId);
//       let newQuantity;
  
//       if (cartItemIndex > -1) {
//         // Product already in cart, check limits before increasing quantity
//         const currentQuantity = user.cart[cartItemIndex].quantity;
  
//         if (currentQuantity >= 5) {
//           return res.status(400).json({ 
//             status: false, 
//             message: "Maximum 5 quantity per user reached", 
//             quantity: currentQuantity 
//           });
//         }
  
//         if (currentQuantity >= product.quantity) {
//           return res.status(400).json({ 
//             status: false, 
//             message: "Cannot add more, product is out of stock", 
//             quantity: currentQuantity 
//           });
//         }
  
//         user.cart[cartItemIndex].quantity += 1;
//         newQuantity = user.cart[cartItemIndex].quantity;
//       } else {
//         // Add new product to cart
//         user.cart.push({ productId: productId, quantity: 1 });
//         newQuantity = 1;
//       }
  
//       await user.save();
//       return res.json({ 
//         status: true, 
//         message: "Product added to cart", 
//         quantity: newQuantity, 
//         cartLength: user.cart.length 
//       });
//     } catch (error) {
//       console.error('Error in addToCart:', {
//         message: error.message,
//         stack: error.stack,
//         userId: req.session.user,
//         productId: req.body.productId
//       });
//       return res.status(500).json({ status: false, message: "An error occurred while adding to cart" });
//     }
// };

// // const changeQuantity = async(req,res)=>{
// //   try{
// //     const { productId, action } = req.body;
// //     const userId = req.session.user;

// //     const user = await User.findById(userId);
// //     const product = await Product.findById(productId);
// //     if (!user || !product) {
// //       return res.status(404).json({ status: false, message: "User or Product not found" });
// //     }

// //     const cartItemIndex = user.cart.findIndex(item => item.productId.toString() === productId);

// //     if (cartItemIndex === -1) {
// //       return res.status(404).json({ status: false, message: "Product not found in cart" });
// //     }

// //     if (product.quantity === 0) {
// //       // Remove item if stock is zero
// //       user.cart.splice(cartItemIndex, 1);
// //       await user.save();
// //       return res.json({
// //         status: true,
// //         message: "Product removed from cart due to zero stock",
// //         quantity: 0,
// //         swal: {
// //           title: "Out of Stock!",
// //           text: "This product is no longer available and has been removed from your cart.",
// //           icon: "warning",
// //           confirmButtonText: "OK"
// //         }
// //       });
// //     }

// //     let newQuantity = user.cart[cartItemIndex].quantity;

// // if(action === "increase"){
// //   if(newQuantity>=product.quantity){
// //     return res.status(400).json({status:false,message:"cannot add more, product is out of stock"});

// //   }

// //   newQuantity += 1;
// // } else if (action === 'decrease') {
// //   if (newQuantity > 1) {
// //     newQuantity -= 1;
// //   } else {
// //     user.cart.splice(cartItemIndex, 1);
// //     await user.save();
// //     return res.json({ status: true, message: "Product removed from cart", quantity: 0 });
// //   }
// // } else {
// //   return res.status(400).json({ status: false, message: "Invalid action" });
// // }

// // // Adjust quantity if product stock is lower
// // if (newQuantity > product.quantity) {
// //   newQuantity = product.quantity;
// // }

// // user.cart[cartItemIndex].quantity = newQuantity;
// // await user.save();


// //  // Recalculate cart total
// //  const updatedUser = await User.findById(userId).populate({
// //   path: 'cart.productId',
// //   model: 'Product'
// // });
// // const grandTotal = updatedUser.cart.reduce((total, item) => total + (item.productId.salePrice * item.quantity), 0);

// // return res.json({ 
// //   status: true, 
// //   message: "Cart updated", 
// //   quantity: newQuantity, 
// //   grandTotal: grandTotal 
// // });
// // } catch (error) {
// // console.error('Error in changeQuantity:', error);
// // return res.status(500).json({ status: false, message: "An error occurred while updating the cart" });
// // }
// // };



// const changeQuantity = async (req, res) => {
//     try {
//         const { productId, action } = req.body;
//         const userId = req.session.user;

//         const user = await User.findById(userId);
//         const product = await Product.findById(productId);
//         if (!user || !product) {
//             return res.status(404).json({ status: false, message: "User  or Product not found" });
//         }

//         const cartItemIndex = user.cart.findIndex(item => item.productId.toString() === productId);

//         if (cartItemIndex === -1) {
//             return res.status(404).json({ status: false, message: "Product not found in cart" });
//         }

//         if (product.quantity === 0) {
//             // Remove item if stock is zero
//             user.cart.splice(cartItemIndex, 1);
//             await user.save();
//             return res.json({
//                 status: true,
//                 message: "Product removed from cart due to zero stock",
//                 quantity: 0,
//                 swal: {
//                     title: "Out of Stock!",
//                     text: "This product is no longer available and has been removed from your cart.",
//                     icon: "warning",
//                     confirmButtonText: "OK"
//                 }
//             });
//         }

//         let newQuantity = user.cart[cartItemIndex].quantity;

//         if (action === "increase") {
//             if (newQuantity >= product.quantity) {
//                 return res.status(400).json({ status: false, message: "Cannot add more, product is out of stock" });
//             }

//             newQuantity += 1;
//         } else if (action === 'decrease') {
//             if (newQuantity > 1) {
//                 newQuantity -= 1;
//             } else {
//                 user.cart.splice(cartItemIndex, 1);
//                 await user.save();
//                 return res.json({ status: true, message: "Product removed from cart", quantity: 0 });
//             }
//         } else {
//             return res.status(400).json({ status: false, message: "Invalid action" });
//         }

//         // Adjust quantity if product stock is lower
//         if (newQuantity > product.quantity) {
//             newQuantity = product.quantity;
//         }

//         user.cart[cartItemIndex].quantity = newQuantity;
//         await user.save();

//         // Recalculate cart total
//         const updatedUser  = await User.findById(userId).populate({
//             path: 'cart.productId',
//             model: 'Product'
//         });
//         const grandTotal = updatedUser .cart.reduce((total, item) => total + (item.productId.salePrice * item.quantity), 0);

//         return res.json({
//             status: true,
//             message: "Cart updated",
//             quantity: newQuantity,
//             grandTotal: grandTotal
//         });
//     } catch (error) {
//         console.error('Error in changeQuantity:', error);
//         return res.status(500).json({ status: false, message: "An error occurred while updating the cart" });
//     }
// };







// module.exports = {
//     getCartPage,
//     addToCart,
//     changeQuantity,
// };



const mongoose = require('mongoose'); // Added mongoose import
const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");

const getCartPage = async (req, res) => {
    try {
      const userId = req.session.user;
      const user = await User.findById(userId).populate({
        path: 'cart.productId',
        model: 'Product',
        populate: {
          path: 'category',
          model: 'Category'
        }
      });
  
      if (!user) {
        return res.status(404).send('User not found');
      }
  
      // Adjust cart based on current product stock, removing zero-quantity items
      for (let i = user.cart.length - 1; i >= 0; i--) {
        const item = user.cart[i];
        if (item.productId && (item.productId.quantity === 0 || item.quantity > item.productId.quantity)) {
          if (item.productId.quantity === 0) {
            user.cart.splice(i, 1); // Remove if stock is 0
          } else {
            item.quantity = item.productId.quantity; // Adjust to available stock
          }
        }
      }
      await user.save();

      // Filter out blocked products, unlisted categories, or products with quantity <= 0
      const cartItems = user.cart
        .filter(item => 
          item.productId && 
          !item.productId.isBlocked && 
          item.productId.category && 
          item.productId.category.isListed && 
          item.productId.quantity > 0
        )
        .map(item => ({
          product: item.productId,
          quantity: item.quantity,
          totalPrice: item.productId.salePrice * item.quantity
        }));

      const grandTotal = cartItems.reduce((total, item) => total + item.totalPrice, 0);

      res.render("cart", {
        user,
        cartItems,
        grandTotal
      });
    } catch (error) {
      console.error('Error in getCartPage:', error);
      res.status(500).send('An error occurred while loading the cart');
    }
};

const addToCart = async (req, res) => {
    try {
      const productId = req.body.productId;
      const userId = req.session.user;

      // Validate inputs
      if (!userId || !productId) {
        return res.status(400).json({ status: false, message: "Invalid user or product ID" });
      }

      // Ensure userId and productId are valid MongoDB ObjectIds using mongoose
      if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ status: false, message: "Invalid user or product ID format" });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ status: false, message: "User not found" });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ status: false, message: "Product not found" });
      }
  
      if (product.quantity <= 0) {
        return res.status(400).json({ status: false, message: "Product is out of stock" });
      }
  
      const cartItemIndex = user.cart.findIndex(item => item.productId.toString() === productId);
      let newQuantity;
  
      if (cartItemIndex > -1) {
        // Product already in cart, check limits before increasing quantity
        const currentQuantity = user.cart[cartItemIndex].quantity;
  
        if (currentQuantity >= 5) {
          return res.status(400).json({ 
            status: false, 
            message: "Maximum 5 quantity per user reached", 
            quantity: currentQuantity 
          });
        }
  
        if (currentQuantity >= product.quantity) {
          return res.status(400).json({ 
            status: false, 
            message: "Cannot add more, product is out of stock", 
            quantity: currentQuantity 
          });
        }
  
        user.cart[cartItemIndex].quantity += 1;
        newQuantity = user.cart[cartItemIndex].quantity;
      } else {
        // Add new product to cart
        user.cart.push({ productId: productId, quantity: 1 });
        newQuantity = 1;
      }
  
      await user.save();
      return res.json({ 
        status: true, 
        message: "Product added to cart", 
        quantity: newQuantity, 
        cartLength: user.cart.length 
      });
    } catch (error) {
      console.error('Error in addToCart:', {
        message: error.message,
        stack: error.stack,
        userId: req.session.user,
        productId: req.body.productId
      });
      return res.status(500).json({ status: false, message: "An error occurred while adding to cart" });
    }
};

const changeQuantity = async (req, res) => {
    try {
        const { productId, action } = req.body;
        const userId = req.session.user;

        // Validate MongoDB ObjectIds
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ status: false, message: "Invalid user or product ID format" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ status: false, message: "User not found" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const cartItemIndex = user.cart.findIndex(item => 
            item.productId && item.productId.toString() === productId
        );

        if (cartItemIndex === -1) {
            return res.status(404).json({ status: false, message: "Product not found in cart" });
        }

        // Check if product is out of stock
        if (product.quantity === 0) {
            // Remove item if stock is zero
            user.cart.splice(cartItemIndex, 1);
            await user.save();
            return res.json({
                status: true,
                message: "Product removed from cart due to zero stock",
                quantity: 0
            });
        }

        let newQuantity = user.cart[cartItemIndex].quantity;

        if (action === "increase") {
            // Check maximum limit of 5
            if (newQuantity >= 5) {
                return res.status(400).json({ status: false, message: "Maximum 5 quantity per user" });
            }
            
            // Check stock availability
            if (newQuantity >= product.quantity) {
                return res.status(400).json({ status: false, message: "Cannot add more, product is out of stock" });
            }

            newQuantity += 1;
        } else if (action === 'decrease') {
            if (newQuantity > 1) {
                newQuantity -= 1;
            } else {
                // Remove item if quantity becomes 0
                user.cart.splice(cartItemIndex, 1);
                await user.save();
                return res.json({ status: true, message: "Product removed from cart", quantity: 0 });
            }
        } else {
            return res.status(400).json({ status: false, message: "Invalid action" });
        }

        // Set the new quantity
        user.cart[cartItemIndex].quantity = newQuantity;
        await user.save();

        // Recalculate cart total
        const updatedUser = await User.findById(userId).populate({
            path: 'cart.productId',
            model: 'Product'
        });
        
        const grandTotal = updatedUser.cart.reduce((total, item) => {
            if (item.productId) {
                return total + (item.productId.salePrice * item.quantity);
            }
            return total;
        }, 0);

        return res.json({
            status: true,
            message: "Cart updated",
            quantity: newQuantity,
            grandTotal: grandTotal
        });
    } catch (error) {
        console.error('Error in changeQuantity:', error);
        return res.status(500).json({ status: false, message: "An error occurred while updating the cart" });
    }
};

module.exports = {
    getCartPage,
    addToCart,
    changeQuantity,
};