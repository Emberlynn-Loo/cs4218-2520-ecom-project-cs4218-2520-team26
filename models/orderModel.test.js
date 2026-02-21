import mongoose from "mongoose";
import Order from "./orderModel";

// Ashley Chang Le Xuan, A0252633J
describe("Order Model", () => {
    beforeAll(async () => {
        await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/test");
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    afterEach(async () => {
        await Order.deleteMany({});
    });

    describe("Schema Validation", () => {
        test("should create order with valid data (Products Array BV: 1)", async () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                payment: { method: "credit_card" },
                buyer: new mongoose.Types.ObjectId(),
                status: "Processing",
            };

            // Act
            const order = await Order.create(orderData);

            // Assert
            expect(order.products).toHaveLength(1);
            expect(order.status).toBe("Processing");
        });

        test("should allow multiple products (Products Array BV: 2)", async () => {
            // Arrange
            const products = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];

            // Act
            const order = await Order.create({
                products,
                buyer: new mongoose.Types.ObjectId(),
            });

            // Assert
            expect(order.products).toHaveLength(2);
        });

        test("should allow empty products array (Products Array BV: 0)", async () => {
            // Arrange
            const orderData = {
                buyer: new mongoose.Types.ObjectId(),
            };

            // Act
            const order = await Order.create(orderData);

            // Assert
            expect(order.products).toEqual([]);
        });

        test("should store payment as object", async () => {
            // Arrange
            const payment = { method: "paypal", amount: 100, status: "completed" };

            // Act
            const order = await Order.create({
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
                payment,
            });

            // Assert
            expect(order.payment).toEqual(payment);
        });

        test("should create timestamps", async () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
            };

            // Act
            const order = await Order.create(orderData);

            // Assert
            expect(order.createdAt).toBeInstanceOf(Date);
            expect(order.updatedAt).toBeInstanceOf(Date);
        });
    });

    describe("Status Field Validation", () => {
        test("should accept all valid status values (EP: Valid Status)", async () => {
            // Arrange
            const validStatuses = ["Not Process", "Processing", "Shipped", "deliverd", "cancel"];

            for (const status of validStatuses) {
                // Act
                const order = await Order.create({
                    products: [new mongoose.Types.ObjectId()],
                    buyer: new mongoose.Types.ObjectId(),
                    status,
                });

                // Assert
                expect(order.status).toBe(status);
                await Order.deleteOne({ _id: order._id });
            }
        });

        test("should set default status to 'Not Process' (EP: Undefined)", async () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
            };

            // Act
            const order = await Order.create(orderData);

            // Assert
            expect(order.status).toBe("Not Process");
        });

        test("should reject invalid status (EP: Invalid Status)", async () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
                status: "Invalid",
            };

            // Act
            let error;
            try {
                await Order.create(orderData);
            } catch (e) {
                error = e;
            }

            // Assert
            expect(error).toBeDefined();
            expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
        });

        test("should default to 'Not Process' when status is null (EP: Null)", async () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
                status: null,
            };

            // Act
            const order = await Order.create(orderData);

            // Assert
            expect(order.status).toBe("Not Process");
        });

        test("should reject empty string status (EP: Empty String)", async () => {
            // Arrange
            const orderData = {
                products: [new mongoose.Types.ObjectId()],
                buyer: new mongoose.Types.ObjectId(),
                status: "",
            };

            // Act
            let error;
            try {
                await Order.create(orderData);
            } catch (e) {
                error = e;
            }

            // Assert
            expect(error).toBeDefined();
            expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
        });
    });
});