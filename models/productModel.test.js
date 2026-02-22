import mongoose from "mongoose";
import Product from "./productModel.js";

// Khoo Jing Xiang, A0252605L

describe("Product model schema validation", () => {
  afterAll(async () => {
    await mongoose.disconnect().catch(() => {});
  });

  const validDoc = () => ({
    name: "Razer Viper V3 Pro Wireless Gaming Mouse",
    slug: "razer-viper-v3-pro-wireless-gaming-mouse",
    description:
      "Ultra-lightweight esports wireless mouse with optical sensor, low-latency wireless, and long battery life.",
    price: 215,
    category: new mongoose.Types.ObjectId(),
    quantity: 1,
    shipping: true,
    photo: {
      data: Buffer.from("fake-image-bytes"),
      contentType: "image/jpeg",
    },
  });

  it("should pass for a valid product", async () => {
    const p = new Product(validDoc());
    await expect(p.validate()).resolves.toBeUndefined();
  });

  it("should fail for invalid product fields", async () => {
    const base = validDoc();

    const cases = [
      ["name", { ...base, name: undefined }],
      ["slug", { ...base, slug: undefined }],
      ["description", { ...base, description: undefined }],
      ["price", { ...base, price: undefined }],
      ["category", { ...base, category: undefined }],
      ["quantity", { ...base, quantity: undefined }],
    ];

    for (const [field, doc] of cases) {
      const p = new Product(doc);
      await expect(p.validate()).rejects.toThrow();
      expect(p.validateSync().errors[field]).toBeDefined();
    }
  });

  it("should fail for a non-number price", async () => {
    const p = new Product({ ...validDoc(), price: "not-a-number" });
    const err = p.validateSync();
    expect(err.errors.price).toBeDefined();
  });

  it("should fail for a non-number quantity", async () => {
    const p = new Product({ ...validDoc(), quantity: "one" });
    const err = p.validateSync();
    expect(err.errors.quantity).toBeDefined();
  });

  it("should fail when shipping is not boolean", async () => {
    const p = new Product({ ...validDoc(), shipping: {nope:true}});
    const err = p.validateSync();
    expect(err.errors.shipping).toBeDefined();
  });

  it("should fail when category is not an ObjectId", async () => {
    const p = new Product({ ...validDoc(), category: "not-objectid" });
    const err = p.validateSync();
    expect(err.errors.category).toBeDefined();
  });

  it("should pass for valid photo.data and contentType", async () => {
    const p = new Product({
      ...validDoc(),
      photo: { data: Buffer.from([1, 2, 3]), contentType: "image/png" },
    });

    await expect(p.validate()).resolves.toBeUndefined();
    expect(Buffer.isBuffer(p.photo.data)).toBe(true);
    expect(p.photo.contentType).toBe("image/png");
  });

  it("should add createdAt/updatedAt paths for timestamp option", () => {
    expect(Product.schema.path("createdAt")).toBeDefined();
    expect(Product.schema.path("updatedAt")).toBeDefined();
  });
});
