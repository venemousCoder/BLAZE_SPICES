const jwt = require("jsonwebtoken");
const userModels = require("../models/user");

const secretKey = process.env.SECRET_KEY;

// Function to generate a JWT
function generateToken(payload) {
  console.log("payload jwt: ", payload);
  if (payload) {
    let signedToken = jwt.sign(
      {
        data: payload._id,
      },
      secretKey,
      { expiresIn: "1h" }
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
            console.log("Error culprit");
            return res.status(401).redirect("/error");
          } else {
            res.locals.message = "User not found";
            console.log("Error culprit");
            return res.status(401).redirect("/error");
          }
        });
      } else {
        res.locals.message = "Cannot verify API token";
        console.log("Error culprit");
        return res.status(401).redirect("/error/");
      }
    });
  } else {
    res.locals.message = "Provide Token";
    console.log("Error culprit");
    return res.status(401).redirect("/error");
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
            res.locals.message = "Unauthorized Access";
            console.log("Error culprit");
            return res.status(401).redirect("/error");
          } else {
            res.locals.message = "User not found";
            console.log("Error culprit");
            return res.status(401).redirect("/error");
          }
        });
      } else {
        res.locals.message = "Cannot verify API token";
        console.log("Error culprit");
        return res.status(401).redirect("/error/");
      }
    });
  } else {
    res.locals.message = "Provide Token";
    console.log("Error culprit");
    return res.status(401).redirect("/error");
  }
}

module.exports = { generateToken, verifyToken, userVerifyJwt };

// // Example usage
// const payload = { userId: 123, username: 'venemouscoder' };
// const token = generateToken(payload);
// console.log('Generated Token:', token);

// const decoded = verifyToken(token);
// console.log('Decoded Token:', decoded);
