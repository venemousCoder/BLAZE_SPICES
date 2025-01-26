const jwt = require("jsonwebtoken");

const secretKey = process.env.SECRET_KEY;

// Function to generate a JWT
function generateToken(payload) {
  console.log("payload jwt: ", payload);
  if (payload) {
    let signedToken = jwt.sign(
      {
        data: payload._id,
      },
      "1234567890",
      { expiresIn: "1h" }
    );
    return signedToken;
  }
  //   return jwt.sign(payload, secretKey, { expiresIn: "1h" });
  return new Error("userException: user not found");
}

// Function to verify and decode a JWT
function verifyToken(token) {
  try {
    return jwt.verify(token, secretKey);
  } catch (err) {
    console.error("Invalid token", err);
    return null;
  }
}

module.exports = { generateToken, verifyToken };

// // Example usage
// const payload = { userId: 123, username: 'venemouscoder' };
// const token = generateToken(payload);
// console.log('Generated Token:', token);

// const decoded = verifyToken(token);
// console.log('Decoded Token:', decoded);
