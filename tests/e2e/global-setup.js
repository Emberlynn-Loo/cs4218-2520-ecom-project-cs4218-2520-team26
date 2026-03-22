const fs = require("fs/promises");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const ADMIN_EMAIL = "e2e.admin@example.com";
const ADMIN_PASSWORD = "E2EAdmin123!";
const ADMIN_NAME = "E2E Admin";
const STORAGE_STATE_PATH = path.join(__dirname, ".auth", "admin.json");
const BASE_URL = "http://localhost:3000";

module.exports = async () => {
  dotenv.config();

  if (!process.env.MONGO_URL) {
    throw new Error("MONGO_URL is required for Playwright global setup.");
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required for Playwright global setup.");
  }

  await mongoose.connect(process.env.MONGO_URL);
  const users = mongoose.connection.collection("users");

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await users.updateOne(
    { email: ADMIN_EMAIL },
    {
      $set: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        phone: "90000000",
        address: "E2E Admin Address",
        answer: "football",
        role: 1,
      },
    },
    { upsert: true },
  );

  const adminUser = await users.findOne({ email: ADMIN_EMAIL });
  if (!adminUser) {
    throw new Error("Failed to seed E2E admin user.");
  }

  const token = jwt.sign(
    { _id: String(adminUser._id) },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  const authPayload = {
    success: true,
    message: "Login Successful",
    user: {
      _id: String(adminUser._id),
      name: adminUser.name,
      email: adminUser.email,
      phone: adminUser.phone,
      address: adminUser.address,
      role: adminUser.role,
    },
    token,
  };

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: BASE_URL,
        localStorage: [
          {
            name: "auth",
            value: JSON.stringify(authPayload),
          },
        ],
      },
    ],
  };

  await fs.mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await fs.writeFile(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));

  await mongoose.disconnect();
};
