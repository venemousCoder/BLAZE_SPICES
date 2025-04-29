const express = require("express");
require("dotenv").config();
const passport = require("passport");
const googleStrategy = require("passport-google-oauth20").Strategy;
const mongoose = require("mongoose");
const session = require("express-session");
const app = express();
const Admin = require("./models/user");
const MongoDBstore = require("connect-mongodb-session")(session);
const Router = require("./routes/index.routes");
const cors = require("cors");
const ejs = require("ejs");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");

const store = new MongoDBstore({
  uri: process.env.DBURI,
  collection: "sessions",
});
store.on("error", function (error) {
  throw new Error("Session store error: " + error);
});

app.use(
  session({
    store: store,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true, // Ensures cookies are sent only over HTTP(S), not client JS
      secure: false, // Ensures cookies are sent only over HTTPS
    },
    resave: false,
    saveUninitialized: false,
    secret: process.env.SECRET_KEY,
  })
);

app.use(cors());
mongoose
  .connect(process.env.DBURI)
  .then(() => {
    console.log("connected to db");
  })
  .catch((err) => {
    console.log(err);
  });

const PORT = 4000 || process.env.PORT;
app.use("/public", express.static(path.join(__dirname, "/public")));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require("cors")({ origin: "*" }));
app.set("view engine", "ejs");


app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new googleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:4000/auth/google/callback",
      profileFields: ["id", "displayName", "emails"],
    },
    (accessToken, refreshToken, profile, done) => {
      Admin.Account.findOne({ googleId: profile.id })

        .then((user) => {
          if (user) {
            done(null, user);
          } else {
            // console.log("PROFILE: ", profile);
            Admin.Account.findOne({
              email:
                profile.emails && profile.emails.length > 0
                  ? profile.emails[0].value
                  : null,
            })

              .then((existingUser) => {
                if (existingUser) {
                  existingUser.googleId = profile.id;

                  existingUser
                    .save()

                    .then((user) => {
                      done(null, user);
                    })
                    .catch((err) => {
                      done(err, null);
                    });
                } else {
                  new Admin.Account({
                    username: profile.displayName,

                    googleId: profile.id,

                    email: profile.emails[0].value, // assuming the email is available in profile.emails
                  })
                    .save()

                    .then((user) => {
                      done(null, user);
                    })
                    .catch((err) => {
                      done(err, null);
                    });
                }
              })
              .catch((err) => {
                done(err, null);
              });
          }
        })
        .catch((err) => {
          done(err, null);
        });
    }
  )
);
passport.use(Admin.Account.createStrategy());
passport.serializeUser((user, done) => {
  // console.log("serializing user");
  done(null, { id: user.id, type: user.role });
  // console.log("serialized user");
});

passport.deserializeUser((obj, done) => {
  // console.log("deserial");
  // console.log("in if");
  Admin.Account.findById(obj.id)
    .then((user) => {
      // console.log("User deserialized successfully:", user);
      done(null, user);
    })
    .catch((err) => {
      // console.error("Error during deserialization:", err);
      done(err, null);
    });
});

app.set("views", path.join(__dirname, "views"));

app.use((req, res, next) => {
  res.locals.layout = "layout"; // default layout name
  next();
});

app.use("/", Router);
// app.use((req, res, next) => {
//   console.log(
//     // "SESSION\n",
//     // req.session,
//     // "Authenticated\n",
//     // req.isAuthenticated(),
//     // "SESSION TOKEN\n",
//     // req.session.token,
//     // "LOCALS: ",
//     // req.url
//   );
//   return next();
// });
app.listen(PORT, () => {
  console.log("Conneted to server at port " + PORT);
});

module.exports = app;
