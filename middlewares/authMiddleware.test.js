import JWT from "jsonwebtoken";
import { requireSignIn, isAdmin } from "./authMiddleware.js";
import userModel from "../models/userModel.js";

// Mocks
jest.mock("jsonwebtoken", () => ({
    verify: jest.fn(),
}));

jest.mock("../models/userModel.js", () => ({
    findById: jest.fn(),
}));

// Nicholas Koh Zi Lun (A0272806B) - Test suites for authMiddleware.js
describe("authMiddleware", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: {
                authorization: "validToken",
            },
            user: {
                _id: "userId123",
            },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        next = jest.fn();
        jest.clearAllMocks();
        process.env.JWT_SECRET = "testSecret";
    });

    describe("requireSignIn", () => {
        it("should verify token and call next", async () => {
            // Arrange
            const decodedUser = { _id: "userId123" };
            JWT.verify.mockReturnValue(decodedUser);

            // Act
            await requireSignIn(req, res, next);

            // Assert
            expect(JWT.verify).toHaveBeenCalledWith(
                req.headers.authorization,
                process.env.JWT_SECRET
            );
            expect(req.user).toEqual(decodedUser);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it("returns 401 if authorisation token is missing", async () => {
            // Arrange
            req.headers.authorization = null;

            // Act
            await requireSignIn(req, res, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Authorization token is required",
            });
        });

        it("returns 401 if an error occurs during token verification", async () => {
            // Arrange
            const error = new Error("Invalid token");
            JWT.verify.mockImplementation(() => {
                throw error;
            });

            // Act
            await requireSignIn(req, res, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Unauthorized Access",
            });
        });
    });

    describe("isAdmin", () => {
        it("should allow access for admin users", async () => {
            // Arrange
            const adminUser = { role: 1 };
            userModel.findById.mockResolvedValue(adminUser);

            // Act
            await isAdmin(req, res, next);

            // Assert
            expect(userModel.findById).toHaveBeenCalledWith(req.user._id);
            expect(next).toHaveBeenCalledTimes(1);
        });

        it("returns 401 for non-admin users", async () => {
            // Arrange
            const nonAdminUser = { role: 0 };
            userModel.findById.mockResolvedValue(nonAdminUser);

            // Act
            await isAdmin(req, res, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Admin Access Required",
            });
        });

        it("returns 404 if user not found", async () => {
            // Arrange
            userModel.findById.mockResolvedValue(null);

            // Act
            await isAdmin(req, res, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "User not found",
            });
        });

        it("returns 500 if an error occurs", async () => {
            // Arrange
            const error = new Error("Database error");
            userModel.findById.mockRejectedValue(error);
            console.log = jest.fn();

            // Act
            await isAdmin(req, res, next);

            // Assert
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error in admin middleware",
            });
            expect(console.log).toHaveBeenCalledWith(error);
        });
    });
});
