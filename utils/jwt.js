const jwt = require("jsonwebtoken");
const userModels = require("../models/user")

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
        console.log(payload);
        userModels.Account.findById(payload.data).then((user) => {
          if (user) {
            if (user.role === "admin") {
              console.log("sync");
              return next();
            }
            return res.status(401).json({
              error: error,
              message: "Unauthorized",
            });
          } else {
            return res.status(401).json({
              error: error,
              message: "No User account found.",
            });
          }
        });
      } else {
        return res.status(401).json({
          error: error,
          message: "Cannot verify API token.",
        });
      }
    });
  } else {
    return res.status(401).json({
      error: true,
      message: "Provide Token",
    });
  }
}

function userVerifyJwt(req, res, next) {
  const token = req.session.token;

  if (token) {
    jwt.verify(token, secretKey, (error, payload) => {
      if (payload) {
        console.log(payload);
        userModels.Account.findById(payload.data).then((user) => {
          if (user) {
            console.log("sync");
            return next();
          } else {
            return res.status(401).json({
              error: error,
              message: "No User account found.",
            });
          }
        });
      } else {
        return res.status(401).json({
          error: error,
          message: "Cannot verify API token.",
        });
      }
    });
  } else {
    return res.status(401).json({
      error: true,
      message: "Provide Token",
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
