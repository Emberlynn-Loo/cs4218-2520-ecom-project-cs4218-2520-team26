import { updateProfileController, getOrdersController, getAllOrdersController, orderStatusController } from "./authController.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { hashPassword } from "../helpers/authHelper.js";

jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");
jest.mock("../helpers/authHelper.js");

describe("authController - Profile and Orders", () => {
    let req, res;

    beforeEach(() => {
        req = {
            user: { _id: "user123" },
            body: {},
            params: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
    });

    // Ashley Chang Le Xuan, A0252633J - updateProfileController tests
    describe("updateProfileController", () => {
        it("should update user profile successfully (EP: password not changed)", async () => {
            // Arrange
            req.body = { name: "John Doe", email: "john@test.com", phone: "1234567890", address: "123 Main St" };
            const mockUser = { name: "Old Name", password: "oldpass", phone: "0000000000", address: "Old Address" };
            const mockUpdatedUser = { _id: "user123", name: "John Doe", email: "john@test.com", phone: "1234567890", address: "123 Main St" };
            userModel.findById.mockResolvedValue(mockUser);
            userModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

            // Act
            await updateProfileController(req, res);

            // Assert
            expect(userModel.findById).toHaveBeenCalledWith("user123");
            expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                {
                    name: "John Doe",
                    password: mockUser.password,
                    phone: "1234567890",
                    address: "123 Main St",
                },
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Profile Updated Successfully",
                updatedUser: mockUpdatedUser,
            });
        });

        it("should update password when provided and valid (EP: only password changed)", async () => {
            // Arrange
            req.body = { password: "newPassword123", name: "John" };
            const mockUser = { name: "John", password: "oldpass", phone: "123", address: "addr" };
            const hashedPass = "hashedNewPassword";
            userModel.findById.mockResolvedValue(mockUser);
            hashPassword.mockResolvedValue(hashedPass);
            userModel.findByIdAndUpdate.mockResolvedValue({ ...mockUser, password: hashedPass });

            // Act
            await updateProfileController(req, res);

            // Assert
            expect(hashPassword).toHaveBeenCalledWith("newPassword123");
            expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                {
                    name: "John",
                    password: hashedPass,
                    phone: "123",
                    address: "addr",
                },
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Profile Updated Successfully",
                updatedUser: { ...mockUser, password: hashedPass },
            });
        });

        describe("update passwords of different lengths", () => {
            it("should return error when password is less than 6 characters (BV: 5)", async () => {
                // Arrange
                req.body = { password: "five1", name: "John" };
                const mockUser = { name: "John", password: "oldpass", phone: "123", address: "addr" };
                userModel.findById.mockResolvedValue(mockUser);

                // Act
                await updateProfileController(req, res);

                // Assert
                expect(res.json).toHaveBeenCalledWith(
                    { error: "Password is required to be at least 6 characters long" }
                );
            });

            it("should accept password of exactly 6 characters (BV: 6)", async () => {
                // Arrange
                req.body = { password: "six123" };
                const mockUser = { name: "John", password: "oldpass", phone: "123", address: "addr" };
                userModel.findById.mockResolvedValue(mockUser);
                hashPassword.mockResolvedValue("hashedpass");
                userModel.findByIdAndUpdate.mockResolvedValue({ ...mockUser, password: "hashedpass" });

                // Act
                await updateProfileController(req, res);

                // Assert
                expect(hashPassword).toHaveBeenCalledWith("six123");
                expect(res.status).toHaveBeenCalledWith(200);
            });

            it("should accept password of more than 6 characters (BV: 7)", async () => {
                // Arrange
                req.body = { password: "seven12" };
                const mockUser = { name: "John", password: "oldpass", phone: "123", address: "addr" };
                userModel.findById.mockResolvedValue(mockUser);
                hashPassword.mockResolvedValue("hashedpass");
                userModel.findByIdAndUpdate.mockResolvedValue({ ...mockUser, password: "hashedpass" });

                // Act
                await updateProfileController(req, res);

                // Assert
                expect(hashPassword).toHaveBeenCalledWith("seven12");
                expect(res.status).toHaveBeenCalledWith(200);
            });
        })
        

        it("should handle errors during update", async () => {
            // Arrange
            req.body = { name: "John" };
            userModel.findById.mockRejectedValue(new Error("Database error"));

            // Act
            await updateProfileController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Updating Profile",
                error: new Error("Database error"),
            });
        });

        it("should preserve existing user data when fields not provided (EP: Only name changes)", async () => {
            // Arrange
            req.body = { name: "New Name" };
            const mockUser = { name: "Old Name", password: "pass", phone: "1234567890", address: "123 Main" };
            const mockUpdatedUser = { ...mockUser, name: "New Name" };
            userModel.findById.mockResolvedValue(mockUser);
            userModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

            // Act
            await updateProfileController(req, res);

            // Assert
            expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                {
                    name: "New Name",
                    password: mockUser.password,
                    phone: mockUser.phone,
                    address: mockUser.address,
                },
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Profile Updated Successfully",
                updatedUser: mockUpdatedUser,
            });
        });

        it("should fallback to existing name when name is not provided (EP: Name not changed)", async () => {
            // Arrange
            req.body = { phone: "9999999" };
            const mockUser = { name: "Existing Name", password: "pass", phone: "1234567890", address: "123 Main" };
            const mockUpdatedUser = { ...mockUser, phone: "9999999" };
            userModel.findById.mockResolvedValue(mockUser);
            userModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

            // Act
            await updateProfileController(req, res);

            // Assert
            expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                {
                    name: mockUser.name,
                    password: mockUser.password,
                    phone: "9999999",
                    address: mockUser.address,
                },
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Profile Updated Successfully",
                updatedUser: mockUpdatedUser,
            });
        });
    });

    // Ashley Chang Le Xuan, A0252633J - getOrdersController tests
    describe("getOrdersController", () => {
        it("should retrieve orders for logged in user", async () => {
            // Arrange
            const mockOrders = [
                { _id: "order1", buyer: "user123", products: ["prod1"], status: "Not Processed" },
                { _id: "order2", buyer: "user123", products: ["prod2"], status: "Shipped" },
            ];
            orderModel.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue(mockOrders),
                }),
            });

            // Act
            await getOrdersController(req, res);

            // Assert
            expect(orderModel.find).toHaveBeenCalledWith({ buyer: "user123" });
            expect(res.json).toHaveBeenCalledWith(mockOrders);
        });

        it("should handle errors when retrieving orders", async () => {
            // Arrange
            orderModel.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockRejectedValue(new Error("Database error")),
                }),
            });

            // Act
            await getOrdersController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Getting Orders",
                error: new Error("Database error"),
            });
        });

        it("should return empty array when user has no orders", async () => {
            // Arrange
            orderModel.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockResolvedValue([]),
                }),
            });

            // Act
            await getOrdersController(req, res);

            // Assert
            expect(orderModel.find).toHaveBeenCalledWith({ buyer: "user123" });
            expect(res.json).toHaveBeenCalledWith([]);
        });
    });

    // Ashley Chang Le Xuan, A0252633J - getAllOrdersController tests
    describe("getAllOrdersController", () => {
        it("should retrieve all orders sorted by creation date", async () => {
            // Arrange
            const mockOrders = [
                { _id: "order1", buyer: "user1", status: "Shipped" },
                { _id: "order2", buyer: "user2", status: "Not Processed" },
            ];
            orderModel.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        sort: jest.fn().mockResolvedValue(mockOrders),
                    }),
                }),
            });

            // Act
            await getAllOrdersController(req, res);

            // Assert
            expect(orderModel.find).toHaveBeenCalledWith({});
            expect(res.json).toHaveBeenCalledWith(mockOrders);
        });

        it("should handle errors when retrieving all orders", async () => {
            // Arrange
            orderModel.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        sort: jest.fn().mockRejectedValue(new Error("Database error")),
                    }),
                }),
            });

            // Act
            await getAllOrdersController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Getting Orders",
                error: new Error("Database error"),
            });
        });

        it("should return empty array when no orders exist", async () => {
            // Arrange
            orderModel.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        sort: jest.fn().mockResolvedValue([]),
                    }),
                }),
            });

            // Act
            await getAllOrdersController(req, res);

            // Assert
            expect(orderModel.find).toHaveBeenCalledWith({});
            expect(res.json).toHaveBeenCalledWith([]);
        });
    });

    // Ashley Chang Le Xuan, A0252633J - orderStatusController tests
    describe("orderStatusController", () => {
        it("should update order status successfully", async () => {
            // Arrange
            req.params = { orderId: "order123" };
            req.body = { status: "Shipped" };
            const mockUpdatedOrder = { _id: "order123", status: "Shipped", buyer: "user123" };
            orderModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedOrder);

            // Act
            await orderStatusController(req, res);

            // Assert
            expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "order123",
                { status: "Shipped" },
                { new: true }
            );
            expect(res.json).toHaveBeenCalledWith(mockUpdatedOrder);
        });

        it("should handle different status values", async () => {
            const validStatuses = ["Not Processed", "Processing", "Shipped", "Delivered", "Cancelled"];

            for (const status of validStatuses) {
                // Arrange
                req.params = { orderId: "order123" };
                req.body = { status };
                const mockUpdatedOrder = { _id: "order123", status, buyer: "user123" };
                orderModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedOrder);

                // Act
                await orderStatusController(req, res);

                // Assert
                expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
                    "order123",
                    { status },
                    { new: true }
                );
                expect(res.json).toHaveBeenCalledWith(mockUpdatedOrder);

                // Reset mocks between iterations
                jest.clearAllMocks();
            }
        });

        it("should handle errors when updating order status", async () => {
            // Arrange
            req.params = { orderId: "order123" };
            req.body = { status: "Shipped" };
            orderModel.findByIdAndUpdate.mockRejectedValue(new Error("Database error"));

            // Act
            await orderStatusController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Updating Order",
                error: new Error("Database error"),
            });
        });

        it("should handle missing orderId", async () => {
            // Arrange
            req.params = { orderId: "" };
            req.body = { status: "Shipped" };
            orderModel.findByIdAndUpdate.mockResolvedValue(null);

            // Act
            await orderStatusController(req, res);

            // Assert
            expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "",
                { status: "Shipped" },
                { new: true }
            );
            expect(res.json).toHaveBeenCalledWith(null);
        });
    });
});