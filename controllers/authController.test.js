import { 
    registerController,
    loginController,
    forgotPasswordController,
    testController,
    updateProfileController,
    getOrdersController,
    getAllOrdersController,
    orderStatusController } from "./authController.js";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { comparePassword, hashPassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";

// Mocks
jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("jsonwebtoken", () => ({
    sign: jest.fn(),
    verify: jest.fn(),
}));

// Constants
const mockUser = {
    _id: "00000000000000000000000",
    name: "John Doe",
    email: "john@example.com",
    password: "password",
    phone: "1234567890",
    address: "123 Main St",
    answer: "blue",
};
const mockToken = "mocktoken";

const makeLeanQuery = (result) => ({
  lean: jest.fn().mockResolvedValue(result),
});

const makeSelectQuery = (result) => ({
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(result),
});

// Tests
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

    // Nicholas Koh Zi Lun, A0272806B - registerController tests
    describe("registerController", () => {
        let req, res;
        beforeEach(() => {
            req = {
                body: {},
            };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
            jest.clearAllMocks();
        });

        it("should register a new user successfully", async () => {
            // Arrange
            req.body = { ...mockUser };
            userModel.findOne.mockReturnValue(makeLeanQuery(null));
            hashPassword.mockResolvedValue("hashedpassword");
            userModel.prototype.save.mockResolvedValue({ ...mockUser, password: "hashedpassword" });

            // Act
            await registerController(req, res);

            // Assert
            expect(userModel.findOne).toHaveBeenCalledWith({ email: mockUser.email });
            expect(hashPassword).toHaveBeenCalledWith(mockUser.password);
            expect(userModel.prototype.save).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "User Registered Successfully",
            });
        });

        it("should return 400 when name is missing", async () => {
            // Arrange
            req.body = { ...mockUser, name: undefined };

            // Act
            await registerController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Name is Required",
            });
        });

        it("should return 400 when email is missing", async () => {
            // Arrange
            req.body = { ...mockUser, email: undefined };

            // Act
            await registerController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Email is Required",
            });
        });

        it("should return 400 when email format is invalid", async () => {
            // Arrange
            req.body = { ...mockUser, email: "notanemail" };

            // Act
            await registerController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Please enter a valid email address",
            });
        });

        it("should return 400 when password is missing", async () => {
            // Arrange
            req.body = { ...mockUser, password: undefined };

            // Act
            await registerController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Password is Required",
            });
        });

        it("should return 400 when password is too short", async () => {
            // Arrange
            req.body = { ...mockUser, password: "abc" };

            // Act
            await registerController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        });

        it("should return 400 when phone is missing", async () => {
            // Arrange
            req.body = { ...mockUser, phone: undefined };

            // Act
            await registerController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Phone no is Required",
            });
        });

        it("should return 400 when phone format is invalid", async () => {
            // Arrange
            req.body = { ...mockUser, phone: "abc" };

            // Act
            await registerController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Please enter a valid phone number",
            });
        });

        it("should return 400 when address is missing", async () => {
            // Arrange
            req.body = { ...mockUser, address: undefined };

            // Act
            await registerController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Address is Required",
            });
        });

        it("should return 400 when answer is missing", async () => {
            // Arrange
            req.body = { ...mockUser, answer: undefined };

            // Act
            await registerController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Answer is Required",
            });
        });

        it("should return 409 when email already exists", async () => {
            // Arrange
            req.body = { ...mockUser };
            userModel.findOne.mockReturnValue(makeLeanQuery({ ...mockUser }));

            // Act
            await registerController(req, res);

            // Assert
            expect(userModel.findOne).toHaveBeenCalledWith({ email: mockUser.email });
            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "This email has already been registered. Please login",
            });
        });
            
        it("should return 500 if an error occurs during registration", async () => {
            // Arrange
            req.body = { ...mockUser };
            userModel.findOne.mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error("Database error")) });
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            // Act
            await registerController(req, res);

            // Assert
            expect(userModel.findOne).toHaveBeenCalledWith({ email: mockUser.email });
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error registering user",
            });
            consoleSpy.mockRestore();
        });
    });
    
    // Nicholas Koh Zi Lun, A0272806B - loginController tests
    describe("loginController", () => {
        let req, res;

        beforeEach(() => {
            req = {
                body: {},
            };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
            jest.clearAllMocks();
        });

    it("should login successfully with valid credentials", async () => {
      // Arrange
      req.body = { email: mockUser.email, password: mockUser.password };
      userModel.findOne.mockReturnValue(
        makeSelectQuery({ ...mockUser, password: "hashedpassword" }),
      );
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockReturnValue(mockToken);

            // Act
            await loginController(req, res);

            // Assert
            expect(userModel.findOne).toHaveBeenCalledWith({ email: mockUser.email });
            expect(comparePassword).toHaveBeenCalledWith(mockUser.password, "hashedpassword");
            expect(JWT.sign).toHaveBeenCalledWith({ _id: mockUser._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Login Successful",
                token: mockToken,
                user: {
                    _id: mockUser._id,
                    name: mockUser.name,
                    email: mockUser.email,
                    phone: mockUser.phone,
                    address: mockUser.address,
                    role: mockUser.role,
                },
            });
        });

        it("should return 401 when email is missing", async () => {
            // Arrange
            req.body = { password: mockUser.password };

            // Act
            await loginController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Email is required",
            });
        });

        it("should return 400 when email format is invalid", async () => {
            // Arrange
            req.body = { email: "notanemail", password: mockUser.password };

            // Act
            await loginController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Please enter a valid email address",
            });
        });

        it("should return 401 when password is missing", async () => {
            // Arrange
            req.body = { email: mockUser.email };

            // Act
            await loginController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Password is required",
            });
        });

    it("should return 404 when email is not registered", async () => {
      // Arrange
      req.body = { email: mockUser.email, password: mockUser.password };
      userModel.findOne.mockReturnValue(makeSelectQuery(null));

            // Act
            await loginController(req, res);

            // Assert
            expect(userModel.findOne).toHaveBeenCalledWith({ email: mockUser.email });
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "No account found with this email",
            });
        });

    it("should return 401 when password is invalid", async () => {
      // Arrange
      req.body = { email: mockUser.email, password: "wrongpassword" };
      userModel.findOne.mockReturnValue(
        makeSelectQuery({ ...mockUser, password: "hashedpassword" }),
      );
      comparePassword.mockResolvedValue(false);

            // Act
            await loginController(req, res);

            // Assert
            expect(userModel.findOne).toHaveBeenCalledWith({ email: mockUser.email });
            expect(comparePassword).toHaveBeenCalledWith("wrongpassword", "hashedpassword");
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Incorrect password",
            });
        });

    it("should return 500 if an error occurs during login", async () => {
      // Arrange
      req.body = { email: mockUser.email, password: mockUser.password };
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockRejectedValue(new Error("Database error")),
        }),
      });
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            // Act
            await loginController(req, res);

            // Assert
            expect(userModel.findOne).toHaveBeenCalledWith({ email: mockUser.email });
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error during Login",
            });
            consoleSpy.mockRestore();
        });
    });

    // Nicholas Koh Zi Lun, A0272806B - forgotPasswordController tests
    describe("forgotPasswordController", () => {
        let req, res;
        beforeEach(() => {
            req = {
                body: {},
            };
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
            jest.clearAllMocks();
        });

        it("should reset password successfully with valid input", async () => {
            // Arrange
            req.body = { email: mockUser.email, answer: mockUser.answer, newPassword: "newpassword" };
            userModel.findOne.mockResolvedValue({ ...mockUser });
            hashPassword.mockResolvedValue("hashednewpassword");
            userModel.findOneAndUpdate.mockResolvedValue({ ...mockUser, password: "hashednewpassword" });

            // Act
            await forgotPasswordController(req, res);

            // Assert
            expect(userModel.findOne).toHaveBeenCalledWith({ email: mockUser.email, answer: mockUser.answer });
            expect(hashPassword).toHaveBeenCalledWith("newpassword");
            expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
                mockUser._id,
                { password: "hashednewpassword" }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Password Reset Successfully",
            });
        });

        it("should return 400 when email is missing", async () => {
            // Arrange
            req.body = { answer: mockUser.answer, newPassword: "newpassword" };

            // Act
            await forgotPasswordController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Email is required",
            });
        });

        it("should return 400 when answer is missing", async () => {
            // Arrange
            req.body = { email: mockUser.email, newPassword: "newpassword" };

            // Act
            await forgotPasswordController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Answer is required",
            });
        });

        it("should return 400 when new password is missing", async () => {
            // Arrange
            req.body = { email: mockUser.email, answer: mockUser.answer };

            // Act
            await forgotPasswordController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "New password is required",
            });
        });

        it("should return 401 when email is wrong", async () => {
            // Arrange
            req.body = { email: "wrong@example.com", answer: mockUser.answer, newPassword: "newpassword" };
            userModel.findOne.mockResolvedValue(null);

            // Act
            await forgotPasswordController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Wrong Email Or Answer",
            });
        });

        it("should return 401 when answer is wrong", async () => {
            // Arrange
            req.body = { email: mockUser.email, answer: "wronganswer", newPassword: "newpassword" };
            userModel.findOne.mockResolvedValue(null);

            // Act
            await forgotPasswordController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Wrong Email Or Answer",
            });
        });

        it("should return 500 if an error occurs during forgot password", async () => {
            // Arrange
            req.body = { email: mockUser.email, answer: mockUser.answer, newPassword: "newpassword" };
            userModel.findOne.mockRejectedValue(new Error("Database error"));
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            // Act
            await forgotPasswordController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error in forgot password",
            });
            consoleSpy.mockRestore();
        });
    });

    // Nicholas Koh Zi Lun, A0272806B - testController tests
    describe("testController", () => {
        let req, res;
        beforeEach(() => {
            req = {};
            res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };
            jest.clearAllMocks();
        });

        it("should return success message for protected route", async () => {
            // Act
            await testController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Protected Routes",
            });
        });
    });

    // Ashley Chang Le Xuan, A0252633J - updateProfileController tests
    describe("updateProfileController", () => {
        it("should update user profile successfully (EP: password not changed)", async () => {
            // Arrange
            req.body = { name: "John Doe", email: "john@test.com", phone: "1234567890", address: "123 Main St" };
            const mockUpdatedUser = { _id: "user123", name: "John Doe", email: "john@test.com", phone: "1234567890", address: "123 Main St" };
            userModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

            // Act
            await updateProfileController(req, res);

            // Assert
            expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                {
                    $set: {
                        name: "John Doe",
                        phone: "1234567890",
                        address: "123 Main St",
                    },
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
            const hashedPass = "hashedNewPassword";
            hashPassword.mockResolvedValue(hashedPass);
            const mockUpdatedUser = { name: "John", password: hashedPass };
            userModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

            // Act
            await updateProfileController(req, res);

            // Assert
            expect(hashPassword).toHaveBeenCalledWith("newPassword123");
            expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                {
                    $set: {
                        name: "John",
                        password: hashedPass,
                    },
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

        describe("update passwords of different lengths", () => {
            it("should return error when password is less than 6 characters (BV: 5)", async () => {
                // Arrange
                req.body = { password: "five1", name: "John" };
                const mockUser = { name: "John", password: "oldpass", phone: "123", address: "addr" };
                userModel.findById.mockResolvedValue(mockUser);

                // Act
                await updateProfileController(req, res);

                // Assert
                expect(res.status).toHaveBeenCalledWith(400);
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
            userModel.findByIdAndUpdate.mockRejectedValue(new Error("Database error"));
            jest.spyOn(console, "log").mockImplementation(() => {});

            // Act
            await updateProfileController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Updating Profile",
                error: new Error("Database error"),
            });
            console.log.mockRestore()
        });

        it("should only update provided fields (EP: Only name changes)", async () => {
            // Arrange
            req.body = { name: "New Name" };
            const mockUpdatedUser = { name: "New Name" };
            userModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

            // Act
            await updateProfileController(req, res);

            // Assert
            expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                { $set: { name: "New Name" } },
                { new: true }
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Profile Updated Successfully",
                updatedUser: mockUpdatedUser,
            });
        });

        it("should only update provided fields (EP: Only phone changes)", async () => {
            // Arrange
            req.body = { phone: "9999999" };
            const mockUpdatedUser = { phone: "9999999" };
            userModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedUser);

            // Act
            await updateProfileController(req, res);

            // Assert
            expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "user123",
                { $set: { phone: "9999999" } },
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
            const populateBuyerMock = jest.fn().mockResolvedValue(mockOrders);
            const populateProductsMock = jest.fn().mockReturnValue({
                populate: populateBuyerMock,
            });
            orderModel.find.mockReturnValue({ populate: populateProductsMock });

            // Act
            await getOrdersController(req, res);

            // Assert
            expect(orderModel.find).toHaveBeenCalledWith({ buyer: "user123" });
            expect(populateProductsMock).toHaveBeenCalledWith("products", "-photo");
            expect(populateBuyerMock).toHaveBeenCalledWith("buyer", "name");
            expect(res.json).toHaveBeenCalledWith(mockOrders);
        });

        it("should handle errors when retrieving orders", async () => {
            // Arrange
            orderModel.find.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockRejectedValue(new Error("Database error")),
                }),
            });
            jest.spyOn(console, "log").mockImplementation(() => {});

            // Act
            await getOrdersController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Getting Orders",
                error: new Error("Database error"),
            });
            console.log.mockRestore();
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
            const sortMock = jest.fn().mockResolvedValue(mockOrders);
            const populateBuyerMock = jest.fn().mockReturnValue({ sort: sortMock });
            const populateProductsMock = jest.fn().mockReturnValue({
                populate: populateBuyerMock,
            });
            orderModel.find.mockReturnValue({ populate: populateProductsMock });

            // Act
            await getAllOrdersController(req, res);

            // Assert
            expect(orderModel.find).toHaveBeenCalledWith({});
            expect(populateProductsMock).toHaveBeenCalledWith("products", "-photo");
            expect(populateBuyerMock).toHaveBeenCalledWith("buyer", "name");
            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
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
            jest.spyOn(console, "log").mockImplementation(() => {});

            // Act
            await getAllOrdersController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Getting Orders",
                error: new Error("Database error"),
            });
            console.log.mockRestore();
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

        it("should handle errors when updating order status", async () => {
            // Arrange
            req.params = { orderId: "order123" };
            req.body = { status: "Shipped" };
            orderModel.findByIdAndUpdate.mockRejectedValue(new Error("Database error"));
            jest.spyOn(console, "log").mockImplementation(() => {});

            // Act
            await orderStatusController(req, res);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error While Updating Order",
                error: new Error("Database error"),
            });

            console.log.mockRestore();
        });
    });
});