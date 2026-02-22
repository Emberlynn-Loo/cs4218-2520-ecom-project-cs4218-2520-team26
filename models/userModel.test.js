// Emberlynn Loo, A0XXXXXXX
import mongoose from "mongoose";
import User from "./userModel.js";

describe("User Model", () => {
    // Test schema field definitions
    describe("Schema fields", () => {
        it("should have all required fields defined in schema", () => {
            const paths = User.schema.paths;
            expect(paths.name).toBeDefined();
            expect(paths.email).toBeDefined();
            expect(paths.password).toBeDefined();
            expect(paths.phone).toBeDefined();
            expect(paths.address).toBeDefined();
            expect(paths.answer).toBeDefined();
            expect(paths.role).toBeDefined();
        });

        it("name should be required and trimmed", () => {
            const namePath = User.schema.paths.name;
            expect(namePath.isRequired).toBe(true);
            expect(namePath.options.trim).toBe(true);
        });

        it("email should be required and unique", () => {
            const emailPath = User.schema.paths.email;
            expect(emailPath.isRequired).toBe(true);
            expect(emailPath.options.unique).toBe(true);
        });

        it("password should be required", () => {
            expect(User.schema.paths.password.isRequired).toBe(true);
        });

        it("phone should be required", () => {
            expect(User.schema.paths.phone.isRequired).toBe(true);
        });

        it("address should be required", () => {
            expect(User.schema.paths.address.isRequired).toBe(true);
        });

        it("answer should be required", () => {
            expect(User.schema.paths.answer.isRequired).toBe(true);
        });

        it("role should default to 0", () => {
            expect(User.schema.paths.role.defaultValue).toBe(0);
        });
    });

    describe("Model validation", () => {
        it("should fail validation when name is missing", async () => {
            const user = new User({
                email: "test@test.com",
                password: "password",
                phone: "12345678",
                address: "123 Street",
                answer: "answer",
            });
            const err = user.validateSync();
            expect(err.errors.name).toBeDefined();
        });

        it("should fail validation when email is missing", async () => {
            const user = new User({
                name: "Test",
                password: "password",
                phone: "12345678",
                address: "123 Street",
                answer: "answer",
            });
            const err = user.validateSync();
            expect(err.errors.email).toBeDefined();
        });

        it("should fail validation when password is missing", async () => {
            const user = new User({
                name: "Test",
                email: "test@test.com",
                phone: "12345678",
                address: "123 Street",
                answer: "answer",
            });
            const err = user.validateSync();
            expect(err.errors.password).toBeDefined();
        });

        it("should fail validation when phone is missing", async () => {
            const user = new User({
                name: "Test",
                email: "test@test.com",
                password: "password",
                address: "123 Street",
                answer: "answer",
            });
            const err = user.validateSync();
            expect(err.errors.phone).toBeDefined();
        });

        it("should pass validation with all required fields", () => {
            const user = new User({
                name: "Test User",
                email: "test@test.com",
                password: "password123",
                phone: "12345678",
                address: "123 Street",
                answer: "myAnswer",
            });
            const err = user.validateSync();
            expect(err).toBeUndefined();
        });

        it("should set role to 0 by default", () => {
            const user = new User({
                name: "Test",
                email: "test@test.com",
                password: "pass",
                phone: "12345678",
                address: "addr",
                answer: "ans",
            });
            expect(user.role).toBe(0);
        });

        it("should allow setting role to 1 (admin)", () => {
            const user = new User({
                name: "Admin",
                email: "admin@test.com",
                password: "pass",
                phone: "12345678",
                address: "addr",
                answer: "ans",
                role: 1,
            });
            expect(user.role).toBe(1);
        });

        it("should have timestamps", () => {
            expect(User.schema.options.timestamps).toBe(true);
        });

        it("model name should be users", () => {
            expect(User.modelName).toBe("users");
        });
    });
});