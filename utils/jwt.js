const jwt = require("jsonwebtoken");
const userModels = require("../models/user");

const secretKey = process.env.SECRET_KEY;

// Function to generate a JWT
function generateToken(payload) {
  // console.log("payload jwt: ", payload);
  if (payload) {
    let signedToken = jwt.sign(
      {
        data: payload._id,
      },
      secretKey,
      { expiresIn: "24h" }
    );
    return signedToken;
  }
  //   return jwt.sign(payload, secretKey, { expiresIn: "1h" });
  return new Error("userException: user not found");
}

// Function to verify and decode a JWT
function verifyToken(req, res, next) {
  const token = req.session.token;

  if (token) {
    jwt.verify(token, secretKey, (error, payload) => {
      if (payload) {
        userModels.Account.findById(payload.data).then((user) => {
          if (user) {
            if (user.role === "admin") {
              console.log("sync");
              return next();
            }
            res.locals.message = "Unauthorized Access";
            console.log("Error culprit0");
            return res.render("error", {
              error: error,
              description: error.message,
              status: 401,
            });
          } else {
            res.locals.message = "User not found";
            console.log("Error culprit1");
            return res.render("error", {
              error: error,
              description: error.message,
              status: 401,
            });
          }
        });
      } else {
        res.locals.message = "Cannot verify API token";
        console.log("Error culprit2");
        return res.status(401).redirect("/error/");
      }
    });
  } else {
    res.locals.message = "Provide Token";
    console.log("Error culprit3");
    let error = new Error("Token not found");
    return res.render("error", {
      error,
      description: error.message,
      status: 401,
    });
  }
}

function userVerifyJwt(req, res, next) {
  const token = req.session.token;

  if (token) {
    jwt.verify(token, secretKey, (error, payload) => {
      if (payload) {
        userModels.Account.findById(payload.data).then((user) => {
          if (user) {
            if (user.role === "user") {
              console.log("sync");
              return next();
            }
            console.log("Error culprit0");
            return res.render("login", {
              error: "UserException",
              description: "Unauthorized Access",
              status: 401,
            });
          } else {
            res.locals.message = "User not found";
            console.log("Error culprit01");
            return res.render("login", {
              error: "UserException",
              description: "User not found",
              status: 401,
            });
          }
        });
      } else {
        console.log("Error culprit02");
        var error = "ServerError";
        // res.locals.message = "Cannot verify API token";
        // var status = 401;
        req.logout((err) => {
          return res.status(401).redirect("/signup");
        });
      }
    });
  } else {
    console.log("Error culprit03", token);
    return res.render("login", {
      error: "SERVERError",
      description: "TOKEN NOT FOUND",
      status: 500,
    });
  }
}

module.exports = { generateToken, verifyToken, userVerifyJwt };

// // Example usage
// const payload = { userId: 123, username: 'venemouscoder' };
// const token = generateToken(payload);
// console.log('Generated Token:', token);

// const decoded = verifyToken(token);
// console.log('Decoded Token:', decoded);
