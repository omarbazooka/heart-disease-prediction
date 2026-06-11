const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const prisma = require("../config/prisma");

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error("Server misconfiguration: JWT_SECRET is not set in .env");
  }
  // Shorten access token lifetime default to 15 minutes for security
  return jwt.sign({ userId }, secret, {
    expiresIn: process.env.JWT_EXPIRE || "15m",
  });
};

const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString("hex");
  const days = Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS) || 7;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
  return token;
};

const registerUser = async (req, res, next) => {
  try {
    const { national_id, username, email, password } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { national_id }] },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or national ID already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: { national_id, username, email: email.toLowerCase(), password: hashedPassword },
    });

    const accessToken = generateToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: userWithoutPassword,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username.trim(),
          mode: "insensitive",
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid username or password",
      });
    }

    const accessToken = generateToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: "Login successful",
      data: userWithoutPassword,
      token: accessToken,
      refreshToken: refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

const refreshUserToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (new Date() > storedToken.expiresAt) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return res.status(401).json({
        success: false,
        message: "Refresh token has expired. Please log in again.",
      });
    }

    const newAccessToken = generateToken(storedToken.user.id);
    const newRefreshToken = crypto.randomBytes(40).toString("hex");
    const days = Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { token: newRefreshToken, expiresAt },
    });

    res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshUserToken,
};
