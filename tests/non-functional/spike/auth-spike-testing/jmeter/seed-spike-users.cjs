/**
 * Seed script for auth spike test users.
 *
 * Created by Nicholas Koh Zi Lun, A0272806B
 */

"use strict";

const path = require("path");
const fs = require("fs");
const readline = require("readline");

require("dotenv").config({ path: path.resolve(__dirname, "../../../../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;
const CSV_PATH = path.join(__dirname, "auth-users.csv");

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone:    { type: String, required: true },
    address:  { type: mongoose.Schema.Types.Mixed, required: true },
    answer:   { type: String, required: true },
    role:     { type: Number, default: 0 },
  },
  { timestamps: true },
);
userSchema.index({ email: 1 }, { unique: true });
const User = mongoose.models.users || mongoose.model("users", userSchema);

async function parseCsv(filePath) {
  const rows = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let isHeader = true;
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (isHeader) { isHeader = false; continue; }
    const [email, password] = line.split(",").map((s) => s.trim());
    if (email && password) rows.push({ email, password });
  }
  return rows;
}

async function main() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error("❌  MONGO_URL is not set. Check your .env file.");
    process.exit(1);
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌  CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  console.log("🔌  Connecting to MongoDB...");
  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 10000 });
  console.log("✅  Connected.\n");

  const credentials = await parseCsv(CSV_PATH);
  console.log(`📋  Found ${credentials.length} users in CSV.\n`);

  let created = 0;
  let skipped = 0;

  for (const { email, password } of credentials) {
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      console.log(`   ⏭  Already exists: ${email}`);
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const userIndex = email.match(/(\d+)@/)?.[1] || "0";

    await User.create({
      name: `Spike User ${userIndex}`,
      email,
      password: hashed,
      phone: `+6591234${userIndex.padStart(4, "0")}`,
      address: "1 Test Street, Singapore 123456",
      answer: "spike",
    });

    console.log(`   ✅  Created: ${email}`);
    created++;
  }

  console.log(`\n🎉  Done. Created: ${created}, Skipped (already existed): ${skipped}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Seed failed:", err.message || err);
  mongoose.disconnect().finally(() => process.exit(1));
});
