import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { getOrdersController } from "./authController.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const createUser = async ({ email, name }) => {
  const passwordHash = await hashPassword("orderPassword123");
  return userModel.create({
    name,
    email,
    password: passwordHash,
    phone: "88888888",
    address: { line1: "Order Address" },
    answer: "pet",
  });
};

const createProduct = async ({ name, slug, price }) => {
  const category = await categoryModel.create({
    name: `${name} Category`,
    slug: `${slug}-category`,
  });

  return productModel.create({
    name,
    slug,
    description: `${name} description`,
    price,
    category: category._id,
    quantity: 20,
    shipping: true,
  });
};

const createOrder = async ({ buyerId, productIds, status = "Not Processed" }) => {
  return orderModel.create({
    products: productIds,
    payment: { id: "payment-1", success: true },
    buyer: buyerId,
    status,
  });
};

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await orderModel.deleteMany({});
  await productModel.deleteMany({});
  await categoryModel.deleteMany({});
  await userModel.deleteMany({});
  jest.clearAllMocks();
});

describe("getOrdersController integration with orderModel", () => {
  describe("EP - Order ownership filter partitions", () => {
    it("EP: returns all orders when all stored orders belong to the authenticated user", async () => {
      // Arrange
      const buyer = await createUser({
        name: "Buyer User",
        email: "orders-buyer-all@test.com",
      });
      const productA = await createProduct({
        name: "Product A",
        slug: "product-a",
        price: 100,
      });
      const productB = await createProduct({
        name: "Product B",
        slug: "product-b",
        price: 200,
      });

      await createOrder({
        buyerId: buyer._id,
        productIds: [productA._id],
        status: "Processing",
      });
      await createOrder({
        buyerId: buyer._id,
        productIds: [productB._id],
        status: "Shipped",
      });

      const req = { user: { _id: buyer._id.toString() } };
      const res = createMockResponse();

      // Act
      await getOrdersController(req, res);

      // Assert
      const returnedOrders = res.json.mock.calls[0][0];
      expect(returnedOrders).toHaveLength(2);
      expect(returnedOrders.every((order) => order.buyer._id.toString() === buyer._id.toString())).toBe(true);
    });

    it("EP: returns only orders for the authenticated user when orders exist for multiple users", async () => {
      // Arrange
      const buyer = await createUser({
        name: "Buyer User",
        email: "orders-buyer@test.com",
      });
      const otherUser = await createUser({
        name: "Other User",
        email: "orders-other@test.com",
      });
      const buyerProduct = await createProduct({
        name: "Buyer Product",
        slug: "buyer-product",
        price: 120,
      });
      const otherProduct = await createProduct({
        name: "Other Product",
        slug: "other-product",
        price: 70,
      });

      await createOrder({
        buyerId: buyer._id,
        productIds: [buyerProduct._id],
        status: "Processing",
      });
      await createOrder({
        buyerId: otherUser._id,
        productIds: [otherProduct._id],
        status: "Shipped",
      });

      const req = { user: { _id: buyer._id.toString() } };
      const res = createMockResponse();

      // Act
      await getOrdersController(req, res);

      // Assert
      const returnedOrders = res.json.mock.calls[0][0];
      expect(returnedOrders).toHaveLength(1);
      expect(returnedOrders[0].buyer._id.toString()).toBe(buyer._id.toString());
    });

    it("EP: returns empty array when authenticated user has no orders", async () => {
      // Arrange
      const userWithoutOrders = await createUser({
        name: "No Orders User",
        email: "orders-empty@test.com",
      });
      const req = { user: { _id: userWithoutOrders._id.toString() } };
      const res = createMockResponse();

      // Act
      await getOrdersController(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  it("populates product details and excludes product photo binary payload", async () => {
    // Arrange
    const buyer = await createUser({
      name: "Product Population User",
      email: "orders-products@test.com",
    });
    const productA = await createProduct({
      name: "Laptop",
      slug: "laptop",
      price: 999,
    });
    const productB = await createProduct({
      name: "Mouse",
      slug: "mouse",
      price: 29,
    });
    await createOrder({
      buyerId: buyer._id,
      productIds: [productA._id, productB._id],
      status: "Processing",
    });

    const req = { user: { _id: buyer._id.toString() } };
    const res = createMockResponse();

    // Act
    await getOrdersController(req, res);

    // Assert
    const returnedOrder = res.json.mock.calls[0][0][0];
    expect(returnedOrder.products).toHaveLength(2);

    const productNames = returnedOrder.products.map((product) => product.name);
    expect(productNames).toEqual(expect.arrayContaining(["Laptop", "Mouse"]));
    expect(returnedOrder.products[0].photo?.data).toBeUndefined();
    expect(returnedOrder.products[1].photo?.data).toBeUndefined();
  });

  it("populates buyer with name only (without sensitive fields)", async () => {
    // Arrange
    const buyer = await createUser({
      name: "Buyer Name Only",
      email: "orders-buyer-fields@test.com",
    });
    const product = await createProduct({
      name: "Buyer Field Product",
      slug: "buyer-field-product",
      price: 49,
    });
    await createOrder({
      buyerId: buyer._id,
      productIds: [product._id],
      status: "Processing",
    });

    const req = { user: { _id: buyer._id.toString() } };
    const res = createMockResponse();

    // Act
    await getOrdersController(req, res);

    // Assert
    const returnedBuyer = res.json.mock.calls[0][0][0].buyer;
    expect(returnedBuyer.name).toBe("Buyer Name Only");
    expect(returnedBuyer.email).toBeUndefined();
    expect(returnedBuyer.phone).toBeUndefined();
    expect(returnedBuyer.password).toBeUndefined();
    expect(returnedBuyer.answer).toBeUndefined();
  });
});
