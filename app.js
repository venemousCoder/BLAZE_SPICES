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

const store = new MongoDBstore({
  uri: process.env.DBURI,
  collection: "sessions",
  expires: 24 * 60 * 60 * 1000,
});
store.on("error", function (error) {
  throw new Error("Session store error: " + error);
});

app.use(
  session({
    store: store,
    maxAge: 24 * 60 * 60 * 1000,
    resave: false,
    saveUninitialized: false,
    secret: process.env.SECRET_KEY,
  })
);

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
    },
    (accessToken, refreshToken, profile, done) => {
      Admin.Account.findOne({ googleId: profile.id })

        .then((user) => {
          if (user) {
            done(null, user);
          } else {
            Admin.Account.findOne({ email: profile.emails[0].value })

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
  console.log("serializing user");
  done(null, { id: user.id, type: user.role });
  console.log("serialized user");
});

passport.deserializeUser((obj, done) => {
  console.log("deserial");
  console.log("in if");
  Admin.Account.findById(obj.id)
    .then((user) => {
      console.log("done");
      done(null, user);
    })
    .catch((err) => {
      done(null, err);
    });
});

app.use("/", Router);
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  console.log(
    "middleware",
    req.session,
    req.isAuthenticated(),
    "Session token ",
    req.session.token
  );
  return next();
});
app.listen(PORT, () => {
  console.log("Conneted to server at port " + PORT);
});

module.exports = app;
