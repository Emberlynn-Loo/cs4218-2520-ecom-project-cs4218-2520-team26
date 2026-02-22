import mongoose from "mongoose";
import Order from "./orderModel";

// Ashley Chang Le Xuan, A0252633J
describe("Order Model", () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe("Schema Validation", () => {
        it("should create order with valid data (Products Array BV: 1)", () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                payment: { method: "credit_card" },
                buyer: new mongoose.Types.ObjectId(),
                status: "Processing",
            };

            // Act
            const order = new Order(orderData);

            // Assert
            expect(order.products).toHaveLength(1);
            expect(order.status).toBe("Processing");
        });

        it("should allow multiple products (Products Array BV: 2)", () => {
            // Arrange
            const products = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];

            // Act
            const order = new Order({ products, buyer: new mongoose.Types.ObjectId() });

            // Assert
            expect(order.products).toHaveLength(2);
        });

        it("should allow empty products array (Products Array BV: 0)", () => {
            // Arrange
            const orderData = { buyer: new mongoose.Types.ObjectId() };

            // Act
            const order = new Order(orderData);

            // Assert
            expect(order.products).toEqual([]);
        });

        it("should store payment as object", () => {
            // Arrange
            const payment = { method: "paypal", amount: 100, status: "completed" };

            // Act
            const order = new Order({
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
                payment,
            });

            // Assert
            expect(order.payment).toEqual(payment);
        });
    });

    describe("Status Field Validation", () => {
        it("should accept all valid status values (EP: Valid Status)", () => {
            // Arrange
            const validStatuses = ["Not Processed", "Processing", "Shipped", "Delivered", "Cancelled"];

            for (const status of validStatuses) {
                // Act
                const order = new Order({ status });
                const error = order.validateSync();

                // Assert
                expect(error).toBeUndefined();
                expect(order.status).toBe(status);
            }
        });

        it("should set default status to 'Not Processed' (EP: Undefined)", () => {
            // Arrange
            const orderData = { buyer: new mongoose.Types.ObjectId() };

            // Act
            const order = new Order(orderData);

            // Assert
            expect(order.status).toBe("Not Processed");
        });

        it("should reject invalid status (EP: Invalid Status)", () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
                status: "Invalid",
            };

            // Act
            const order = new Order(orderData);
            const error = order.validateSync();

            // Assert
            expect(error).toBeDefined();
            expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
        });

        it("should default to 'Not Processed' when status is null (EP: Null)", () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
                status: null,
            };

            // Act
            const order = new Order(orderData);

            // Assert
            expect(order.status).toBe("Not Processed");
        });

        it("should reject empty string status (EP: Empty String)", () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
                status: "",
            };

            // Act
            const order = new Order(orderData);
            const error = order.validateSync();

            // Assert
            expect(error).toBeDefined();
            expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
        });
    });
});