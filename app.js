if(process.env.NODE_ENV != "production"){
   require('dotenv').config();
}

const express=require("express");
const app=express();
const mongoose=require("mongoose");
const Listing=require("./models/listing.js");
const path=require("path");
const methodOverride=require("method-override");
const ejsMate=require("ejs-mate");
const wrapAsync=require("./utils/wrapAsync.js");
const ExpressError=require("./utils/ExpressError.js");
const {listingSchema,reviewSchema}=require("./schema.js");
const Review=require("./models/review.js");
const session=require("express-session");
const MongoStore = require("connect-mongo").default;
const flash = require("connect-flash");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const User=require("./models/user.js");
const listingRouter=require("./routes/listing.js");
const reviewRouter=require("./routes/review.js");
const userRouter=require("./routes/user.js");

const dbUrl = process.env.ATLASDB_URL;

main()
  .then(()=>{
    console.log("Connect to DB");
})
  .catch((err)=>{
    console.log(err);
});
async function main() {
    await mongoose.connect(dbUrl);
}
//Index Route
app.set("view engine", "ejs");
app.set("views", path.join(__dirname,"views"));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto:{
        secret:  process.env.SECRET
    },
    touchAfter: 24*3600,
});

store.on("error",()=>{
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions={
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
     cookie: {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
};


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate())); 

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser=req.user;
    next();
});

// app.get("/demouser", async(req,res)=>{
//     let fakeUser=new User({
//         email:"student@gmail.com",
//         username: "delta-student"
//     });
//     let registeredUser=await User.register(fakeUser,"helloworld");
//     res.send("registeredUser");
// });
app.get("/listings", wrapAsync(async(req,res) =>{
    const allListings=await Listing.find({});
    res.render("listings/index.ejs",{allListings});
}));

const validateListing=(req,res,next)=>{
    let {error}=listingSchema.validate(req.body);
    
    if(error){
        let errMsg=error.details.map((el)=>el.message).join(",");
        throw new ExpressError(400, errMsg);
    }else{
        next();
    }
}

const validateReview=(req,res,next)=>{
    let {error}=reviewSchema.validate(req.body);

    if(error){
        let errMsg=error.details.map((el)=>el.message).join(",");
        throw new ExpressError(400, errMsg);
    }else{
        next();
    }
};

app.use("/listings",listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/",userRouter);

// //reviews
// //POST Route
// app.post("/listings/:id/reviews", validateReview,async(req,res)=>{
//     let listing= await Listing.findById(req.params.id);
//     let newReview=new Review(req.body.review);
//     listing.reviews.push(newReview);
//     await newReview.save();
//     await listing.save();

//     res.redirect((`/listings/${listing._id}`));
// });
// //delete review route
// app.delete("/listings/:id/reviews/:reviewId", wrapAsync(async(req,res)=>{
//     let {id,reviewId}=req.params;
//     await Listing.findByIdAndUpdate(id,{$pull: {reviews: reviewId},});
//     await Review.findByIdAndDelete(reviewId);

//     res.redirect(`/listings/${id}`);
// }));
// app.get("/testListing",async (req,res)=>{
//     let samplelisting=new Listing({
//       title:"My new villa",
//       description:"By the nature",
//       price:1200,
//       location:"Goa",
//       country:"India"
//     }
//     );
//     await samplelisting.save();
//     console.log("Sample was saved");
//     res.send("succesfull testing");
// });

// app.get("/",(req,res)=>{
//     res.send("Hi I am root");
// });

app.use((req,res,next)=>{
    next(new ExpressError(404,"Page not found!"));
});

app.use((err,req,res,next)=>{
    let {statusCode=500,message="something went wrong"}=err;
    res.status(statusCode).render("error.ejs", {message});
    //res.status(statusCode).send(message);
});

app.listen(8080, ()=>{
    console.log("Server is listening to port 8080");
});
