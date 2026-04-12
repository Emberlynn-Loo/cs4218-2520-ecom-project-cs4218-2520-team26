import { jest } from "@jest/globals";

jest.mock("mongoose", () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
  },
}));

jest.mock("colors", () => {
  const define = (prop) => {
    if (!Object.getOwnPropertyDescriptor(String.prototype, prop)) {
      Object.defineProperty(String.prototype, prop, {
        get() {
          return this.toString();
        },
        configurable: true,
      });
    }
  };

  define("bgMagenta");
  define("bgRed");

  if (!Object.getOwnPropertyDescriptor(String.prototype, "white")) {
    Object.defineProperty(String.prototype, "white", {
      get() {
        return this.toString();
      },
      configurable: true,
    });
  }

  return { __esModule: true, default: {} };
});

import mongoose from "mongoose";
import connectDB from "./db.js";

// Khoo Jing Xiang, A0252605L

describe("connectDB", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.MONGO_URL = "mongodb://fake-url-for-tests";
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  it("should log a success message when mongoose.connect resolves", async () => {
    // Arrange
    mongoose.connect.mockResolvedValueOnce({
      connection: { host: "localhost" },
    });

    // Act
    await connectDB();

    // Assert
    expect(mongoose.connect).toHaveBeenCalledWith(
      "mongodb://fake-url-for-tests",
      {
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxIdleTimeMS: 60000,
        waitQueueTimeoutMS: 5000,
      },
    );
    expect(console.log).toHaveBeenCalledTimes(1);

    expect(console.log.mock.calls[0][0]).toContain(
      "Connected To Mongodb Database localhost",
    );
  });

  it("should log error messages when mongoose.connect rejects", async () => {
    // Arrange
    const err = new Error("boom");
    mongoose.connect.mockRejectedValueOnce(err);

    // Act
    await expect(connectDB()).rejects.toThrow("boom");

    // Assert
    expect(mongoose.connect).toHaveBeenCalledWith(
      "mongodb://fake-url-for-tests",
      {
        maxPoolSize: 20,
        minPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxIdleTimeMS: 60000,
        waitQueueTimeoutMS: 5000,
      },
    );
    expect(console.log).toHaveBeenCalledTimes(1);
    expect(console.log.mock.calls[0][0]).toContain("Error in Mongodb");
    expect(console.log.mock.calls[0][0]).toContain("boom");
  });
});
