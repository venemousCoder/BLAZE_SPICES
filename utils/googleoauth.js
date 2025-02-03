
async function googleauth(){
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI
      );
      oAuth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      });
      const email = req.body.email;
      try {
        const user = await userModels.Account.findOne({ email: email });
        if (!user) {
          return res.status(404).json({
            status: "fail",
            message: "User not found",
          });
        }
        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour
      }catch (err) {
        return res.status(500).json({
          status: "fail",
          message: "Failed to send email",
          error: err,
        });
      }
    }

    module.exports = googleauth