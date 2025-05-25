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
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const groupSockets = require("./controllers/groupsockets.controller");
const crypto = require("crypto");
const io = new Server(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("message", (data) => {
    // Broadcast the message to all connected clients
    io.emit("message", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
groupSockets(io);
// Replace app.listen with http.listen at the end of the file
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
      secure: process.env.NODE_ENV === "production", // Ensures cookies are sent only over HTTPS
      sameSite: "lax", // Prevents CSRF attacks
    },
    resave: false,
    saveUninitialized: false,
    secret: process.env.SECRET_KEY,
  })
);

app.use(cors({ origin: "*" }));

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
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use("/css", express.static(path.join(__dirname, "public/css")));
app.use("/", express.static("/"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new googleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.NODE_ENV === "production"
          ? "https://your-live-domain.com/auth/google/callback"
          : "http://localhost:4000/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      // Check if user exists
      Admin.Account.findOne({ email: profile.emails[0].value })
        .then((user) => {
          if (user) {
            return done(null, user);
          } else {
            // Create new user with User discriminator
            const newUser = new Admin.User({
              username: profile.displayName,
              email: profile.emails[0].value,
              role: "user",
              verified: true,
            });

            // Generate a random password for Google users
            Admin.User.register(
              newUser,
              crypto.randomBytes(16).toString("hex"),
              (err, user) => {
                if (err) return done(err);
                return done(null, user);
              }
            );
          }
        })
        .catch((err) => {
          return done(err);
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

// app.use((req, res, next) => {
//   console.log(
//     "SESSION\n",
//     req.session,
//     "Authenticated\n",
//     req.isAuthenticated(),
//     "SESSION TOKEN\n",
//     req.session.token,
//     "URL: ",
//     req.originalUrl,
//     "USER: ",
//     req.session.passport
//   );
//   return next();
// });
app.use("/", Router);
http.listen(PORT, () => {
  console.log("Conneted to server at port " + PORT);
});

module.exports = app;
