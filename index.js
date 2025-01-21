let express = require('express');
require('dotenv').config();
let passport = require('passport');
let mongoose = require('mongoose');
let session = require('express-session');
let app = express();
const Admin = require("./models/user.models");
const MongoDBstore = require('connect-mongodb-session')(session);
let Router = require('./routes/index.routes');

var store = new MongoDBstore({
    uri: process.env.DBURI,
    collection: 'sessions',
    expires: 24 * 60 * 60 * 1000,
    

})
store.on('error', function(error) {
    throw new Error('Session store error: ' + error)
})

app.use(session({
    store: store,
    maxAge: 24 * 60 * 60 * 1000,
    resave: false,
    saveUninitialized: false,
    secret: process.env.SECRET_KEY
}))

mongoose.connect(process.env.DBURI)
    .then(() => {
        console.log('connected to db')
    }).catch((err) => {
        console.log(err)
    });

let PORT = 4000 || process.env.PORT
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(require('cors')({ origin: "*" }));

app.use(passport.initialize());
app.use(passport.session());

passport.use(Admin.Account.createStrategy());
passport.serializeUser((user, done) => {
    console.log("serializing user")
    done(null, { id: user.id, type: user.role });
    console.log('serialized user')
});

passport.deserializeUser((obj, done) => {
    console.log("deserial")
        console.log("in if")
        Admin.Account.findById(obj.id)
            .then((user) => {
                console.log("done");
                done(null, user);
            }).catch((err) => {
                done(null, err);
            });

});


app.use("/", Router)
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    console.log("middleware", req.session, req.isAuthenticated(), 'Session token ', req.session.token);
    return next();
})
app.listen(PORT, () => {
    console.log('Conneted to server at port ' + PORT);
})

module.exports = app;
