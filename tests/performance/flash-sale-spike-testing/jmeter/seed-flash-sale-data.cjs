"use strict";

const path = require("path");
const fs = require("fs");
const readline = require("readline");

require("dotenv").config({ path: path.resolve(__dirname, "../../../../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS  = Number(process.env.BCRYPT_ROUNDS || 8);
const FORCE_RESEED = process.env.FORCE_RESEED === "true";

const USERS_CSV_PATH = path.join(__dirname, "flash-sale-users.csv");
const PRODUCTS_CSV_PATH = path.join(__dirname, "flash-sale-products.csv");

// ── Inline schemas (avoids ESM/CJS interop issues) ─────────────────────────

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

const categorySchema = new mongoose.Schema({
  name:  { type: String, trim: true },
  slug:  { type: String, lowercase: true, unique: true, index: true },
});
categorySchema.index({ slug: 1 }, { unique: true });
const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);

const productSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    slug:        { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true },
    price:       { type: Number, required: true },
    category:    { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    quantity:    { type: Number, required: true },
    photo:       { data: Buffer, contentType: String },
    shipping:    { type: Boolean },
  },
  { timestamps: true },
);
productSchema.index({ createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
const Product = mongoose.models.Products || mongoose.model("Products", productSchema);

// ── Minimal 1×1 transparent PNG (valid image placeholder) ──────────────────
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

// ── Flash-sale product definitions ─────────────────────────────────────────
const FLASH_PRODUCTS = [
  {
    name:        "Flash Sale Product 1",
    slug:        "flash-sale-product-1",
    description: "Limited-time flash sale item #1 — high-demand product for spike testing.",
    price:       9.99,
    quantity:    1000,
    shipping:    true,
  },
  {
    name:        "Flash Sale Product 2",
    slug:        "flash-sale-product-2",
    description: "Limited-time flash sale item #2 — high-demand product for spike testing.",
    price:       19.99,
    quantity:    500,
    shipping:    true,
  },
  {
    name:        "Flash Sale Product 3",
    slug:        "flash-sale-product-3",
    description: "Limited-time flash sale item #3 — high-demand product for spike testing.",
    price:       29.99,
    quantity:    250,
    shipping:    false,
  },
  {
    name:        "Flash Sale Product 4",
    slug:        "flash-sale-product-4",
    description: "Limited-time flash sale item #4 — high-demand product for spike testing.",
    price:       49.99,
    quantity:    100,
    shipping:    true,
  },
  {
    name:        "Flash Sale Product 5",
    slug:        "flash-sale-product-5",
    description: "Limited-time flash sale item #5 — high-demand product for spike testing.",
    price:       99.99,
    quantity:    50,
    shipping:    true,
  },
];

// ── CSV helpers ─────────────────────────────────────────────────────────────

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

function writeProductsCsv(rows) {
  const header = "slug,pid,cid";
  const lines = rows.map(({ slug, pid, cid }) => `${slug},${pid},${cid}`);
  fs.writeFileSync(PRODUCTS_CSV_PATH, [header, ...lines].join("\n") + "\n", "utf8");
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    console.error("❌  MONGO_URL is not set. Check your .env file.");
    process.exit(1);
  }

  if (!fs.existsSync(USERS_CSV_PATH)) {
    console.error(`❌  Users CSV not found: ${USERS_CSV_PATH}`);
    process.exit(1);
  }

  console.log(`🔑  bcrypt rounds: ${SALT_ROUNDS}${SALT_ROUNDS !== 8 ? " (recommend 8 for perf testing)" : ""}`);
  if (FORCE_RESEED) console.log("⚠️   FORCE_RESEED=true — existing flash-sale users will be deleted and recreated.");
  console.log();

  console.log("🔌  Connecting to MongoDB...");
  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 10000 });
  console.log("✅  Connected.\n");

  // ── 1. Seed category ───────────────────────────────────────────────────

  console.log("📂  Seeding flash-sale category...");
  let category = await Category.findOne({ slug: "flash-sale" }).lean();
  if (category) {
    console.log(`   ⏭  Category already exists: flash-sale (${category._id})`);
  } else {
    category = await Category.create({ name: "Flash Sale", slug: "flash-sale" });
    console.log(`   ✅  Created category: flash-sale (${category._id})`);
  }
  const categoryId = category._id;

  // ── 2. Seed products ───────────────────────────────────────────────────

  console.log("\n📦  Seeding flash-sale products...");
  const productRows = [];
  let productsCreated = 0;
  let productsSkipped = 0;

  for (const def of FLASH_PRODUCTS) {
    let existing = await Product.findOne({ slug: def.slug }).lean();
    if (existing) {
      console.log(`   ⏭  Already exists: ${def.slug} (${existing._id})`);
      productsSkipped++;
      productRows.push({ slug: def.slug, pid: String(existing._id), cid: String(categoryId) });
      continue;
    }

    const created = await Product.create({
      ...def,
      category: categoryId,
      photo:    { data: PLACEHOLDER_PNG, contentType: "image/png" },
    });
    console.log(`   ✅  Created: ${def.slug} (${created._id})`);
    productsCreated++;
    productRows.push({ slug: def.slug, pid: String(created._id), cid: String(categoryId) });
  }

  // ── 3. Write products CSV ──────────────────────────────────────────────

  writeProductsCsv(productRows);
  console.log(`\n📄  flash-sale-products.csv written with ${productRows.length} entries.`);
  productRows.forEach(({ slug, pid, cid }) =>
    console.log(`   ${slug} | pid=${pid} | cid=${cid}`),
  );

  // ── 4. Seed users ──────────────────────────────────────────────────────

  console.log("\n👤  Seeding flash-sale users...");
  const credentials = await parseCsv(USERS_CSV_PATH);
  console.log(`📋  Found ${credentials.length} users in CSV.\n`);

  let usersCreated = 0;
  let usersSkipped = 0;

  for (const { email, password } of credentials) {
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      if (FORCE_RESEED) {
        await User.deleteOne({ email });
        console.log(`   🗑️   Deleted for reseed: ${email}`);
      } else {
        console.log(`   ⏭  Already exists: ${email}`);
        usersSkipped++;
        continue;
      }
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const userIndex = email.match(/(\d+)@/)?.[1] || "0";

    await User.create({
      name:    `Flash User ${userIndex}`,
      email,
      password: hashed,
      phone:    `+6598765${userIndex.padStart(4, "0")}`,
      address:  "2 Flash Sale Lane, Singapore 654321",
      answer:   "flash",
    });

    console.log(`   ✅  Created: ${email}`);
    usersCreated++;
  }

  console.log(`\n🎉  Done.`);
  console.log(`   Products — Created: ${productsCreated}, Skipped: ${productsSkipped}`);
  console.log(`   Users    — Created: ${usersCreated}, Skipped: ${usersSkipped}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌  Seed failed:", err.message || err);
  mongoose.disconnect().finally(() => process.exit(1));
});
