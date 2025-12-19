const Users = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require("mongoose");
const {
  sendEmail,
  getVerificationEmailTemplate,
  getPasswordResetTemplate,
  getWelcomeEmailTemplate,
} = require("../utils/sendMail");
const { asyncHandler } = require("../middleware/errorHandler");
const { ValidationError, AuthenticationError, ConflictError } = require("../utils/AppError");

const authCtrl = {
  register: asyncHandler(async (req, res) => {
    const { fullname, username, email, password, gender } = req.body;

    let newUserName = username.toLowerCase().replace(/ /g, "");

    const user_name = await Users.findOne({ username: newUserName });
    if (user_name) {
      throw new ConflictError("This username is already taken.");
    }

    const user_email = await Users.findOne({ email });
    if (user_email) {
      throw new ConflictError("This email is already registered.");
    }

    if (password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters long.");
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(password)) {
      throw new ValidationError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    const newUser = new Users({
      fullname,
      username: newUserName,
      email,
      password: passwordHash,
      gender,
      verificationToken,
      verificationTokenExpires,
      isVerified: false,
    });

    await newUser.save();

    const verificationLink = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    const emailHtml = getVerificationEmailTemplate(fullname, verificationLink);

    try {
      await sendEmail(email, "Verify Your Email - Campus Connect", emailHtml);
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
    }

    res.json({
      msg: "Registration successful! Please check your email to verify your account.",
      user: {
        ...newUser._doc,
        password: "",
      },
    });
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    const { token } = req.params;

    const user = await Users.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new ValidationError("Verification token is invalid or has expired.");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    const welcomeHtml = getWelcomeEmailTemplate(user.username);
    try {
      await sendEmail(user.email, "Welcome to Campus Connect! 🎉", welcomeHtml);
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
    }

    const access_token = createAccessToken({ id: user._id });
    const refresh_token = createRefreshToken({ id: user._id });

    res.cookie("refreshtoken", refresh_token, {
      httpOnly: true,
      path: "/api/refresh_token",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      msg: "Email verified successfully!",
      access_token,
      user: {
        ...user._doc,
        password: "",
      },
    });
  }),

  resendVerificationEmail: asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await Users.findOne({ email });

    if (!user) {
      throw new ValidationError("User not found.");
    }

    if (user.isVerified) {
      throw new ValidationError("Email is already verified.");
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    const verificationLink = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    const emailHtml = getVerificationEmailTemplate(user.username, verificationLink);

    await sendEmail(email, "Verify Your Email - Campus Connect", emailHtml);

    res.json({ msg: "Verification email sent successfully!" });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await Users.findOne({ email });

    if (!user) {
      return res.json({
        msg: "If this email exists, you will receive a password reset link.",
      });
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires > Date.now()) {
      const waitTime = Math.ceil((user.resetPasswordExpires - Date.now()) / 60000);
      return res.status(429).json({
        msg: `Please wait ${waitTime} minutes before requesting another reset.`
      });
    }

    if (user.resetPasswordToken) {
      user.previousResetTokens = user.previousResetTokens || [];
      user.previousResetTokens.push({
        token: user.resetPasswordToken,
        invalidatedAt: new Date()
      });
      
      if (user.previousResetTokens.length > 5) {
        user.previousResetTokens = user.previousResetTokens.slice(-5);
      }
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
    user.resetAttempts = (user.resetAttempts || 0) + 1;
    
    if (user.resetAttempts > 5) {
      user.isBlocked = true;
      user.blockedReason = "Too many password reset attempts";
      await user.save();
      
      return res.status(403).json({
        msg: "Account locked due to suspicious activity. Contact support."
      });
    }
    
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const emailHtml = getPasswordResetTemplate(user.username, resetLink);

    await sendEmail(email, "Password Reset Request - Campus Connect", emailHtml);

    res.json({
      msg: "If this email exists, you will receive a password reset link.",
    });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      throw new ValidationError("Passwords do not match.");
    }

    if (password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters long.");
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(password)) {
      throw new ValidationError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      );
    }

    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await Users.findOne({
        resetPasswordToken,
        resetPasswordExpires: { $gt: Date.now() },
      }).session(session);

      if (!user) {
        await session.abortTransaction();
        throw new ValidationError("Password reset token is invalid or has expired.");
      }

      if (user.previousResetTokens && user.previousResetTokens.length > 0) {
        const isInvalidated = user.previousResetTokens.some(
          old => old.token === resetPasswordToken
        );
        
        if (isInvalidated) {
          await session.abortTransaction();
          throw new ValidationError("This reset link has been invalidated. Please request a new one.");
        }
      }

      const passwordHash = await bcrypt.hash(password, 12);

      user.password = passwordHash;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.resetAttempts = 0;
      user.previousResetTokens = [];
      
      await user.save({ session });
      await session.commitTransaction();

      res.json({ msg: "Password reset successful! You can now login." });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }),

  changePassword: asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, cnfNewPassword } = req.body;

    if (!oldPassword || oldPassword.length === 0) {
      throw new ValidationError("Please enter your old password.");
    }
    if (!newPassword || newPassword.length === 0) {
      throw new ValidationError("Please enter your new password.");
    }
    if (!cnfNewPassword || cnfNewPassword.length === 0) {
      throw new ValidationError("Please confirm your new password.");
    }
    if (newPassword !== cnfNewPassword) {
      throw new ValidationError("Your password does not match");
    }

    const user = await Users.findOne({ _id: req.user._id });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new ValidationError("Your old password is wrong.");
    }

    if (newPassword.length < 8) {
      throw new ValidationError("Password must be at least 8 characters long.");
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (!passwordRegex.test(newPassword)) {
      throw new ValidationError(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await Users.findOneAndUpdate(
      { _id: req.user._id },
      { password: newPasswordHash }
    );

    res.json({ msg: "Password updated successfully." });
  }),

  registerAdmin: asyncHandler(async (req, res) => {
    const { fullname, username, email, password, gender, role } = req.body;

    let newUserName = username.toLowerCase().replace(/ /g, "");

    const user_name = await Users.findOne({ username: newUserName });
    if (user_name) {
      throw new ConflictError("This username is already taken.");
    }

    const user_email = await Users.findOne({ email });
    if (user_email) {
      throw new ConflictError("This email is already registered.");
    }

    if (password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters long.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = new Users({
      fullname,
      username: newUserName,
      email,
      password: passwordHash,
      gender,
      role,
      isVerified: true,
    });

    await newUser.save();

    res.json({ msg: "Admin Registered Successfully." });
  }),

  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await Users.findOne({ email, role: "user" });

    if (!user) {
      throw new AuthenticationError("Invalid credentials.");
    }

    if (user.isBlocked) {
      return res.status(403).json({
        msg: "Your account has been suspended. Please contact support for assistance.",
        isBlocked: true,
        reason: user.blockedReason,
        blockedAt: user.blockedAt
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        msg: "Please verify your email before logging in.",
        requireVerification: true,
        email: user.email 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AuthenticationError("Invalid credentials.");
    }

    const populatedUser = await Users.findById(user._id)
      .populate("followers following", "-password");

    const access_token = createAccessToken({ id: user._id });
    const refresh_token = createRefreshToken({ id: user._id });

    res.cookie("refreshtoken", refresh_token, {
      httpOnly: true,
      path: "/api/refresh_token",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      msg: "Logged in Successfully!",
      access_token,
      user: {
        ...populatedUser._doc,
        password: "",
      },
    });
  }),

  adminLogin: asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await Users.findOne({ email, role: "admin" });

    if (!user) {
      throw new AuthenticationError("Email or Password is incorrect.");
    }

    if (user.isBlocked) {
      return res.status(403).json({
        msg: "Admin account has been disabled. Contact system administrator.",
        isBlocked: true
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AuthenticationError("Email or Password is incorrect.");
    }

    const access_token = createAccessToken({ id: user._id });
    const refresh_token = createRefreshToken({ id: user._id });

    res.cookie("refreshtoken", refresh_token, {
      httpOnly: true,
      path: "/api/refresh_token",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      msg: "Logged in Successfully!",
      access_token,
      user: {
        ...user._doc,
        password: "",
      },
    });
  }),

  logout: asyncHandler(async (req, res) => {
    res.clearCookie("refreshtoken", { path: "/api/refresh_token" });
    return res.json({ msg: "Logged out Successfully." });
  }),

  generateAccessToken: asyncHandler(async (req, res) => {
    const rf_token = req.cookies.refreshtoken;

    if (!rf_token) {
      throw new AuthenticationError("Please login again.");
    }
    
    try {
      const result = await new Promise((resolve, reject) => {
        jwt.verify(rf_token, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        });
      });

      const user = await Users.findById(result.id)
        .select("-password")
        .populate("followers following", "-password");

      if (!user) {
        throw new ValidationError("User does not exist.");
      }

      if (user.isBlocked && user.role !== 'admin') {
        return res.status(403).json({ 
          msg: "Your account has been blocked.",
          isBlocked: true 
        });
      }

      const access_token = createAccessToken({ id: result.id });
      res.json({ access_token, user });
      
    } catch (err) {
      throw new AuthenticationError("Please login again.");
    }
  }),
};

const createAccessToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1d",
  });
};

const createRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "30d",
  });
};

module.exports = authCtrl;