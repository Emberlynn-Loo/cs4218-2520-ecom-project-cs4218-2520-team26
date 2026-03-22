// Integration tests for createProductController, braintreeTokenController and brainTreePaymentController

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import fs from "fs";
import path from "path";

import {
  braintreeTokenController,
  brainTreePaymentController,
  createProductController
} from "../../controllers/productController.js";
import orderModel from "../../models/orderModel.js";
import productModel from "../../models/productModel.js";

// Mock only Braintree gateway at the boundary
jest.mock("braintree", () => {
  const clientTokenGenerateMock = jest.fn();
  const transactionSaleMock = jest.fn();

  const gatewayInstance = {
    clientToken: {
      generate: clientTokenGenerateMock,
    },
    transaction: {
      sale: transactionSaleMock,
    },
  };

  const BraintreeGateway = jest.fn(() => gatewayInstance);

  return {
    BraintreeGateway,
    Environment: { Sandbox: "Sandbox" },
    __clientTokenGenerateMock: clientTokenGenerateMock,
    __transactionSaleMock: transactionSaleMock,
  };
});

import {
  __clientTokenGenerateMock as clientTokenGenerateMock,
  __transactionSaleMock as transactionSaleMock,
} from "braintree";

jest.mock("dotenv", () => ({ config: jest.fn() }));

jest.mock("slugify", () => ({
  __esModule: true,
  default: jest.fn((name) => name.toLowerCase().replace(/ /g, "-")),
}));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForOrderCount = async (expectedCount, tries = 20, delayMs = 50) => {
  for (let i = 0; i < tries; i++) {
    const count = await orderModel.countDocuments();
    if (count === expectedCount) return;
    await sleep(delayMs);
  }
  throw new Error(`Expected ${expectedCount} orders, but not created in time`);
};

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (err) {
    if (err.name !== "MongoClientClosedError") {
      throw err;
    }
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
});

afterEach(async () => {
  await productModel.deleteMany({});
  await orderModel.deleteMany({});
  jest.clearAllMocks();
});

beforeEach(async () => {
  await orderModel.deleteMany({});
  jest.clearAllMocks();
});

const mockCategory = new mongoose.Types.ObjectId();

// Emberlynn Loo, A0255614E
describe("createProductController integration with productModel", () => {
  it("creates product and saves to database with correct slug", async () => {
    // Arrange
    const req = {
      fields: {
        name: "Test Product",
        description: "Test Description",
        price: 99,
        category: mockCategory,
        quantity: 10,
        shipping: true,
      },
      files: {},
    };
    const res = createMockResponse();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Product Created Successfully",
      })
    );
    const savedProduct = await productModel.findOne({ name: "Test Product" });
    expect(savedProduct).not.toBeNull();
    expect(savedProduct.slug).toBe("test-product");
    expect(savedProduct.description).toBe("Test Description");
    expect(savedProduct.price).toBe(99);
    expect(savedProduct.quantity).toBe(10);
  });

  it("retrieves saved product from database by ID", async () => {
    // Arrange
    const req = {
      fields: {
        name: "Findable Product",
        description: "Some Description",
        price: 50,
        category: mockCategory,
        quantity: 5,
      },
      files: {},
    };
    const res = createMockResponse();

    // Act
    await createProductController(req, res);

    // Assert
    const sentData = res.send.mock.calls[0][0];
    const productId = sentData.products._id;
    const foundProduct = await productModel.findById(productId);
    expect(foundProduct).not.toBeNull();
    expect(foundProduct.name).toBe("Findable Product");
    expect(foundProduct.price).toBe(50);
    expect(foundProduct.quantity).toBe(5);
  });

  it("saves photo data and content type when photo is under 1MB", async () => {
    // Arrange
    const fakePhotoPath = path.join("/tmp", "test-photo.jpg");
    const fakePhotoData = Buffer.alloc(500 * 1024);
    fs.writeFileSync(fakePhotoPath, fakePhotoData);

    const req = {
      fields: {
        name: "Photo Product",
        description: "Has a photo",
        price: 120,
        category: mockCategory,
        quantity: 3,
      },
      files: {
        photo: {
          path: fakePhotoPath,
          type: "image/jpeg",
          size: 500 * 1024,
        },
      },
    };
    const res = createMockResponse();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    const savedProduct = await productModel.findOne({ name: "Photo Product" });
    expect(savedProduct).not.toBeNull();
    expect(savedProduct.photo.data).not.toBeNull();
    expect(savedProduct.photo.contentType).toBe("image/jpeg");
    fs.unlinkSync(fakePhotoPath);
  });

  it("rejects photo over 1MB and saves nothing to database", async () => {
    // Arrange
    const req = {
      fields: {
        name: "Big Photo Product",
        description: "Has a big photo",
        price: 100,
        category: mockCategory,
        quantity: 1,
      },
      files: {
        photo: {
          path: "/tmp/bigphoto.jpg",
          type: "image/jpeg",
          size: 2 * 1024 * 1024,
        },
      },
    };
    const res = createMockResponse();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Photo is required and should be less than 1 MB",
      })
    );
    const count = await productModel.countDocuments();
    expect(count).toBe(0);
  });

  it("rejects request and saves nothing when name is missing", async () => {
    // Arrange
    const req = {
      fields: {
        description: "No name provided",
        price: 99,
        category: mockCategory,
        quantity: 1,
      },
      files: {},
    };
    const res = createMockResponse();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Name is Required" })
    );
    const count = await productModel.countDocuments();
    expect(count).toBe(0);
  });

  it("rejects request and saves nothing when description is missing", async () => {
    // Arrange
    const req = {
      fields: {
        name: "No Description Product",
        price: 99,
        category: mockCategory,
        quantity: 1,
      },
      files: {},
    };
    const res = createMockResponse();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Description is Required" })
    );
    const count = await productModel.countDocuments();
    expect(count).toBe(0);
  });

  it("rejects request and saves nothing when price is missing", async () => {
    // Arrange
    const req = {
      fields: {
        name: "No Price Product",
        description: "Missing price",
        category: mockCategory,
        quantity: 1,
      },
      files: {},
    };
    const res = createMockResponse();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Price is Required" })
    );
    const count = await productModel.countDocuments();
    expect(count).toBe(0);
  });

  it("rejects request and saves nothing when category is missing", async () => {
    // Arrange
    const req = {
      fields: {
        name: "No Category Product",
        description: "Missing category",
        price: 99,
        quantity: 1,
      },
      files: {},
    };
    const res = createMockResponse();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Category is Required" })
    );
    const count = await productModel.countDocuments();
    expect(count).toBe(0);
  });

  it("rejects request and saves nothing when quantity is missing", async () => {
    // Arrange
    const req = {
      fields: {
        name: "No Quantity Product",
        description: "Missing quantity",
        price: 99,
        category: mockCategory,
      },
      files: {},
    };
    const res = createMockResponse();

    // Act
    await createProductController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Quantity is Required" })
    );
    const count = await productModel.countDocuments();
    expect(count).toBe(0);
  });

});

// Earnest Suprapmo, A0251966U
describe("braintreeTokenController integration", () => {
  it("returns a client token from the gateway", async () => {
    // Arrange
    clientTokenGenerateMock.mockImplementation((params, callback) => {
      callback(null, { clientToken: "fake-client-token" });
    });
    const req = {};
    const res = createMockResponse();

    // Act
    await braintreeTokenController(req, res);

    // Assert
    expect(clientTokenGenerateMock).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledWith({
      clientToken: "fake-client-token",
    });
  });
});

// Earnest Suprapmo, A0251966U
describe("brainTreePaymentController integration", () => {
  it("creates a transaction and saves an order on success", async () => {
    // Arrange
    const cart = [
      { _id: new mongoose.Types.ObjectId().toString(), price: 10 },
      { _id: new mongoose.Types.ObjectId().toString(), price: 20 },
    ];
    const buyerId = new mongoose.Types.ObjectId().toString();
    const req = {
      body: {
        nonce: "test-nonce",
        cart,
      },
      user: {
        _id: buyerId,
      },
    };
    const res = createMockResponse();

    transactionSaleMock.mockImplementation((saleParams, callback) => {
      const mockResult = {
        success: true,
        transaction: {
          id: "txn_123",
          amount: "30",
        },
      };
      callback(null, mockResult);
    });

    // Act
    await brainTreePaymentController(req, res);

    // Assert
    expect(transactionSaleMock).toHaveBeenCalled();

    await waitForOrderCount(1);
    const orders = await orderModel.find();
    expect(orders).toHaveLength(1);

    const savedOrder = orders[0];
    expect(savedOrder.products).toHaveLength(cart.length);
    expect(savedOrder.buyer.toString()).toBe(buyerId.toString());
    expect(savedOrder.payment).toBeDefined();

    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it("returns 500 and does not create an order when payment fails", async () => {
    // Arrange
    const cart = [
      { _id: new mongoose.Types.ObjectId().toString(), price: 15 },
      { _id: new mongoose.Types.ObjectId().toString(), price: 25 },
    ];
    const buyerId = new mongoose.Types.ObjectId().toString();
    const req = {
      body: {
        nonce: "test-nonce",
        cart,
      },
      user: {
        _id: buyerId,
      },
    };
    const res = createMockResponse();
    const error = new Error("Payment failed");

    transactionSaleMock.mockImplementation((saleParams, callback) => {
      callback(error, null);
    });

    // Act
    await brainTreePaymentController(req, res);

    // Assert
    expect(transactionSaleMock).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(error);

    const orderCount = await orderModel.countDocuments();
    expect(orderCount).toBe(0);
  });
});
