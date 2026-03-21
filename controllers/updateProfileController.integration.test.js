import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { updateProfileController } from "./authController.js";
import userModel from "../models/userModel.js";
import { comparePassword, hashPassword } from "../helpers/authHelper.js";

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const createRequest = (userId, body) => ({
  user: { _id: userId.toString() },
  body,
});

const createUserFixture = async (overrides = {}) => {
  const password = overrides.rawPassword || "oldPassword123";
  const hashedPassword = await hashPassword(password);

  const user = await userModel.create({
    name: "Original Name",
    email: "integration-user@test.com",
    password: hashedPassword,
    phone: "11111111",
    address: { line1: "Old Address", postal: "000000" },
    answer: "blue",
    ...overrides,
    password: overrides.password || hashedPassword,
  });

  return { user, oldPasswordHash: hashedPassword };
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
  await userModel.deleteMany({});
  jest.clearAllMocks();
});

describe("updateProfileController integration with userModel", () => {
  describe("EP - Mutable/immutable profile field partitions", () => {
    it("EP: updates provided name, phone, and address while preserving password", async () => {
      // Arrange
      const { user, oldPasswordHash } = await createUserFixture({
        email: "integration-user-1@test.com",
        address: { line1: "Old Address" },
      });
      const req = createRequest(user._id, {
        name: "Updated Name",
        phone: "99998888",
        address: { line1: "New Address", postal: "123456" },
      });
      const res = createMockResponse();

      // Act
      await updateProfileController(req, res);

      // Assert
      const updatedUser = await userModel.findById(user._id).lean();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Profile Updated Successfully",
        })
      );
      expect(updatedUser.name).toBe("Updated Name");
      expect(updatedUser.phone).toBe("99998888");
      expect(updatedUser.address).toEqual({ line1: "New Address", postal: "123456" });
      expect(updatedUser.password).toBe(oldPasswordHash);
    });

    it("EP: keeps fields unchanged when omitted from request body", async () => {
      // Arrange
      const { user, oldPasswordHash } = await createUserFixture({
        email: "integration-user-4@test.com",
        name: "Keep Fields User",
        phone: "44444444",
        address: { line1: "Initial Address", postal: "654321" },
        answer: "yellow",
      });
      const req = createRequest(user._id, { name: "Only Name Changed" });
      const res = createMockResponse();

      // Act
      await updateProfileController(req, res);

      // Assert
      const updatedUser = await userModel.findById(user._id).lean();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(updatedUser.name).toBe("Only Name Changed");
      expect(updatedUser.phone).toBe("44444444");
      expect(updatedUser.address).toEqual({ line1: "Initial Address", postal: "654321" });
      expect(updatedUser.password).toBe(oldPasswordHash);
    });

    it("EP: empty strings for name/phone/address are treated as omitted via fallback", async () => {
      // Arrange
      const { user, oldPasswordHash } = await createUserFixture({
        email: "integration-user-empty-strings@test.com",
        name: "Fallback User",
        phone: "77777777",
        address: { line1: "Fallback Address", postal: "121212" },
        answer: "purple",
      });
      const req = createRequest(user._id, {
        name: "",
        phone: "",
        address: "",
      });
      const res = createMockResponse();

      // Act
      await updateProfileController(req, res);

      // Assert
      const updatedUser = await userModel.findById(user._id).lean();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(updatedUser.name).toBe("Fallback User");
      expect(updatedUser.phone).toBe("77777777");
      expect(updatedUser.address).toEqual({ line1: "Fallback Address", postal: "121212" });
      expect(updatedUser.password).toBe(oldPasswordHash);
    });

    it("EP: empty body performs no-op update and keeps all persisted fields unchanged", async () => {
      // Arrange
      const { user, oldPasswordHash } = await createUserFixture({
        email: "integration-user-empty-body@test.com",
        name: "No Op User",
        phone: "66666666",
        address: { line1: "No Op Address", postal: "101010" },
        answer: "orange",
      });
      const req = createRequest(user._id, {});
      const res = createMockResponse();

      // Act
      await updateProfileController(req, res);

      // Assert
      const updatedUser = await userModel.findById(user._id).lean();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(updatedUser.name).toBe("No Op User");
      expect(updatedUser.email).toBe("integration-user-empty-body@test.com");
      expect(updatedUser.phone).toBe("66666666");
      expect(updatedUser.address).toEqual({ line1: "No Op Address", postal: "101010" });
      expect(updatedUser.password).toBe(oldPasswordHash);
    });

    it("EP: ignores email updates from request body and keeps existing email", async () => {
      // Arrange
      const { user } = await createUserFixture({
        email: "integration-user-email@test.com",
        name: "Email Partition User",
      });
      const req = createRequest(user._id, {
        email: "should-not-change@test.com",
        name: "Updated Name With Email Attempt",
      });
      const res = createMockResponse();

      // Act
      await updateProfileController(req, res);

      // Assert
      const updatedUser = await userModel.findById(user._id).lean();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(updatedUser.name).toBe("Updated Name With Email Attempt");
      expect(updatedUser.email).toBe("integration-user-email@test.com");
    });
  });

  it("hashes accepted password updates before persistence", async () => {
    // Arrange
    const { user, oldPasswordHash } = await createUserFixture({
      email: "integration-user-2@test.com",
      name: "Password User",
    });
    const req = createRequest(user._id, { password: "newPassword456" });
    const res = createMockResponse();

    // Act
    await updateProfileController(req, res);

    // Assert
    const updatedUser = await userModel.findById(user._id).lean();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(updatedUser.password).not.toBe("newPassword456");
    expect(updatedUser.password).not.toBe(oldPasswordHash);
    expect(await comparePassword("newPassword456", updatedUser.password)).toBe(true);
  });

  describe("BV - Password length boundary at 6", () => {
    it("BV-1: rejects password of length 5 and keeps existing password", async () => {
      // Arrange
      const { user, oldPasswordHash } = await createUserFixture({
        email: "integration-user-bv-1@test.com",
        name: "Boundary Minus One User",
      });
      const req = createRequest(user._id, { password: "12345" });
      const res = createMockResponse();

      // Act
      await updateProfileController(req, res);

      // Assert
      const unchangedUser = await userModel.findById(user._id).lean();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Password is required to be at least 6 characters long",
      });
      expect(unchangedUser.password).toBe(oldPasswordHash);
    });

    it("BV: accepts password of length 6 and persists a hash", async () => {
      // Arrange
      const { user, oldPasswordHash } = await createUserFixture({
        email: "integration-user-bv@test.com",
        name: "Boundary Exact User",
      });
      const req = createRequest(user._id, { password: "123456" });
      const res = createMockResponse();

      // Act
      await updateProfileController(req, res);

      // Assert
      const updatedUser = await userModel.findById(user._id).lean();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(updatedUser.password).not.toBe(oldPasswordHash);
      expect(await comparePassword("123456", updatedUser.password)).toBe(true);
    });

    it("BV+1: accepts password of length 7 and persists a hash", async () => {
      // Arrange
      const { user, oldPasswordHash } = await createUserFixture({
        email: "integration-user-bv-plus-1@test.com",
        name: "Boundary Plus One User",
      });
      const req = createRequest(user._id, { password: "1234567" });
      const res = createMockResponse();

      // Act
      await updateProfileController(req, res);

      // Assert
      const updatedUser = await userModel.findById(user._id).lean();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(updatedUser.password).not.toBe(oldPasswordHash);
      expect(await comparePassword("1234567", updatedUser.password)).toBe(true);
    });
  });
});
