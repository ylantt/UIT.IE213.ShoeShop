const {Product} = require("../models/productModel");
const {Transaction} = require('../models/transactionModel')
const Cart = require("../models/cartModel");
const Wishlist = require("../models/wishlistModel");
const {User} = require("../models/userModel");
const bcrypt = require('bcryptjs');
const passport = require('passport');
const dotenv = require("dotenv");
const mail = require("../models/mailModel");
dotenv.config({ path: "./config.env" });
const countryStateCity = require('country-state-city');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

const stripe = require('stripe')(stripeSecretKey)


exports.addToCart = async (req, res, next) => {
  try {
    
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart: {items: {}});
   
    await Product.findById(productId, function (err, p) {
      if (err) {
        return res.status(404).json({ status: "fail", message: err });    
      }
     
      cart.add(p, productId);
      req.session.cart = cart;
      req.session.save();
    });
    return res.send(cart);
  } catch (err) {
    return res.status(404).json({ status: "fail", message: err });
  }

  next();
};


exports.removeFromCart = async (req, res, next) => {
  try {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart);
   
    await Product.findById(productId, function (err, p) {
      if (err) {
        return res.status(404).json({ status: "fail", message: err });    
      }
     
      cart.remove(p, productId);
      req.session.cart = cart;

      if (req.session.cart.totalQty == 0) {
        req.session.cart = undefined;
      }

      req.session.save();
    });
    return res.send(req.session.cart);
  } catch (err) {
    return res.status(404).json({ status: "fail", message: err });
  }

  next();
};

exports.updateCart = async (req, res, next) => {
  try {
    var productId = req.params.id;
    var newQty = req.body.newQty;
    
    var cart = new Cart(req.session.cart);
   
    await Product.findById(productId, function (err, p) {
      if (err) {
        return res.status(404).json({ status: "fail", message: err });    
      }
     
      cart.updateQty(p, productId, newQty);
      req.session.cart = cart;
      req.session.save();
    });
    return res.send(req.session.cart);
  } catch (err) {
    return res.status(404).json({ status: "fail", message: err });
  }

  next();
};

exports.addToWishlist = async (req, res, next) => {
  try {
    
    var productId = req.params.id;
    var wishlist = new Wishlist(req.session.wishlist ? req.session.wishlist: {items: {}});
   
    await Product.findById(productId, function (err, p) {
      if (err) {
        return res.status(404).json({ status: "fail", message: err });    
      }
     
      wishlist.add(p, productId);
      req.session.wishlist = wishlist;
      req.session.save();
    });
    return res.send(req.session.wishlist);
  } catch (err) {
    return res.status(404).json({ status: "fail", message: err });
  }

  next();
};


exports.removeFromWishlist = async (req, res, next) => {
  try {
    var productId = req.params.id;
    var wishlist = new Wishlist(req.session.wishlist);
   
    await Product.findById(productId, function (err, p) {
      if (err) {
        return res.status(404).json({ status: "fail", message: err });    
      }
     
      wishlist.remove(productId);
      req.session.wishlist = wishlist;
      req.session.save();
    });
    return res.send(req.session.wishlist);
  } catch (err) {
    return res.status(404).json({ status: "fail", message: err });
  }

  next();
};

exports.register = async (req,res) => {
  const { fullname, username, email, phone, password, pwdrepeat} = req.body;
  let errors = [];

  //Check required fields
  if(!fullname || !username || !email || !phone || !password || !pwdrepeat){
    errors.push({msg: 'Please fill in all fields'});
  }

  // Check password match
  if(password != pwdrepeat){
    errors.push({msg: 'Passwords do not match'});
  }

  // Check pass length (should be at least 8 characters long)
  if(password.length < 8 && password.length > 0){
    errors.push({msg: 'Passwords should be at least 8 characters'});
  }
  // Check phone length
  if(phone.length > 10){
    errors.push({msg: 'Phone number allows maximumu 10 numbers in length'});
  }
  if(errors.length > 0){
    //Validation pass
    return res.render('pages/signUp', {
      title: "Sign Up",
      errors,
      fullname,
      username,
      email,
      phone,
      password,
      pwdrepeat
    });
    // console.log(errors);
  }else{
    // Validation pass
    User.findOne({
      $or: [
        { email:email },
        { userName: username }
      ]
    })
    .then(user=>{
      if(user){
        // Users exists
        errors.push({msg: 'Duplicate email or username, please try again'});
        return res.render('pages/signUp', {
          title: "Sign Up",
          errors,
          fullname,
          username,
          email,
          phone,
          password,
          pwdrepeat
        });
        //console.log(errors);
      }else{
        var newUser = new User({
          fullName: fullname,
          userName: username,
          email: email,
          phone: phone,
          password: password
        });

        // Hash password
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then(User => {
                req.flash('success_msg', 'Registered successfully, you can log in now');
                return res.redirect('/signIn');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
  }
};


exports.login = (req, res, next) => {
  passport.authenticate('local', function(err, user, info) {
    // successRedirect: '/', 
    // failureRedirect: '/signIn',
    // failureFlash: true
    req.session.user = user;
    req.session.save();
    // console.log(req.session.user);
    if (err) { 
      return next(err); 
    }
    if (!user) { 
      return res.redirect('/signIn'); 
    } else {
      if(req.session.user.role == 1)
        return res.redirect('/admin');
      else
        return res.redirect('/');
    }
    // req.logIn(user, function(err) {
    //   if (err) { return next(err); }
    //     return res.redirect('/users/' + user.username);
    // });
  }) (req, res, next);
};
exports.removeCart = async(req,res,next) => {
  req.session.cart = undefined;
  return res.send(req.session.cart)
}

exports.postPaymentDone = async (req, res) => {
  var type = req.body.type
  let total = 0
  let cart = req.body.cart
  let product = []
  const user = await User.findOne({email: req.body.user.email});
  if (user.address == null || user.address.number==null || user.address.city==null) 
    user.address = req.body.user.address;
  req.session.user = user;
  req.session.save();
  for (i = 0; i < cart.length; i++) {
    const item = await Product.findById(cart[i].id)
    total =  total + item.price * 100 * cart[i].qty
    product.push({
      info: item._id,
      qty: cart[i].qty
    })
  }
  if (type == "card") {
    await stripe.charges.create({
      amount: total,
      source: req.body.token,
      currency: 'usd',
    }).catch(function (err) {
      console.log(err)
      res.status(500).end()
    })
  }
  try {
    const trans = new Transaction({
      total: total,
      paymentType: type,
      product: product,
      user: user._id,
      status: true
    })
    const newTrans = await trans.save()
    user.transaction.push(newTrans._id);
    await user.save();
    console.log('Charge Successful');
    const html = "<p>here's your order</p>";
    mail.confirmationMail("boong630@gmail.com", "Your order", html);
    return res.json({ message: 'Successfully purchased items\nYour order number: ' + newTrans._id })
  } catch (err) {
    console.log(err)
    return res.status(500).end()
  }
  
}

exports.autoSearchComplete = async (req, res) => {
  try {
    var regex = new RegExp(req.query["term"], "i");

    var productFilter = await Product.find({ name: regex }, { 'name': 1 }).limit(5);

    var result = [];

    if (productFilter && productFilter.length && productFilter.length > 0) {
      productFilter.forEach(product => {
        result.push(product.name);
      })
    }

    res.json(result);
  } catch (err) {
    return res.status(404).json({ status: "fail", message: err });
  }
}

exports.getStatesOfCountry = async (req, res) => {
  try {
    const countryCode = req.body.countryCode;

    const states = 
    countryStateCity.State.getAllStates()
    .filter(state => state["countryCode"] == countryCode)
    .map(state =>
      new Object({
        "isoCode": state["isoCode"],
        "name": state["name"]
      }));

    return res.send(states);
  } catch (err) {
    return res.status(404).json({ status: "fail", message: err });
  }
}

exports.getCitiesOfState = async (req, res) => {
  try {
    const countryCode = req.body.countryCode;
    const stateCode = req.body.stateCode;

    const cities = countryStateCity.City.getAllCities()
    .filter(
      city => city["countryCode"] == countryCode 
      && city["stateCode"] == stateCode
      )
    .map(city => 
      new Object({
        "name": city["name"]
    }));

    return res.send(cities);
  } catch (err) {
    return res.status(404).json({ status: "fail", message: err });
  }
} 