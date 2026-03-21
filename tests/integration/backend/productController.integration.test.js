// Earnest Suprapmo, A0251966U
// Integration tests for braintreeTokenController and brainTreePaymentController

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import {
  braintreeTokenController,
  brainTreePaymentController,
} from "../../../controllers/productController.js";
import orderModel from "../../../models/orderModel.js";

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForOrderCount = async (expectedCount, tries = 5, delayMs = 20) => {
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

beforeEach(async () => {
  await orderModel.deleteMany({});
  jest.clearAllMocks();
});

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
