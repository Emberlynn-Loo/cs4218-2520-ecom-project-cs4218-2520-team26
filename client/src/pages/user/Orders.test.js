import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import Orders from "./Orders";
import { useAuth } from "../../context/auth";

jest.mock("axios");
jest.mock("../../context/auth");
jest.mock("../../components/Layout", () => ({ children, title }) => (
    <div data-testid="layout">{children}</div>
));
jest.mock("../../components/UserMenu", () => () => (
    <div data-testid="user-menu">User Menu</div>
));
jest.mock("moment", () => (date) => ({
    fromNow: () => "2 days ago",
}));

// Ashley Chang Le Xuan, A0252633J
describe("Orders Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Layout Rendering", () => {
        it("should render Orders heading", async () => {
            // Arrange
            useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
            axios.get.mockResolvedValue({ data: [] });

            // Act
            render(<Orders />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText("All Orders")).toBeInTheDocument();
            });
        });

        it("should render UserMenu component", async () => {
            // Arrange
            useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
            axios.get.mockResolvedValue({ data: [] });

            // Act
            render(<Orders />);

            // Assert
            await waitFor(() => {
                expect(screen.getByTestId("user-menu")).toBeInTheDocument();
            });
        });
    });

    describe("Fetching Orders", () => {
        it("should fetch orders on mount when auth token exists (EP: Token present)", async () => {
            // Arrange
            useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
            axios.get.mockResolvedValue({ data: [] });

            // Act
            render(<Orders />);

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
            });
        });

        it("should not fetch orders when auth token is not present (EP: No token)", () => {
            // Arrange
            useAuth.mockReturnValue([{ token: null }, jest.fn()]);

            // Act
            render(<Orders />);

            // Assert
            expect(axios.get).not.toHaveBeenCalled();
        });

        it("should handle axios error gracefully (EP: API error)", async () => {
            // Arrange
            useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
            axios.get.mockRejectedValue(new Error("API Error"));
            console.log = jest.fn();

            // Act
            render(<Orders />);

            // Assert
            await waitFor(() => {
                expect(console.log).toHaveBeenCalledWith(new Error("API Error"));
            });
        });
    });

    describe("Rendering Orders Data", () => {
        it("should render no orders when list is empty (BV: 0 orders)", async () => {
            // Arrange
            useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
            axios.get.mockResolvedValue({ data: [] });

            // Act
            render(<Orders />);

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalled();
            });
            expect(screen.queryByRole("table")).not.toBeInTheDocument();
        });

        it("should render orders with correct data (BV: 1 order)", async () => {
            // Arrange
            const mockOrders = [
                {
                    _id: "1",
                    status: "Processing",
                    buyer: { name: "John Doe" },
                    createdAt: new Date(),
                    payment: { success: true },
                    products: [
                        {
                            _id: "p1",
                            name: "Product 1",
                            description: "Test description",
                            price: 100,
                        },
                    ],
                },
            ];
            useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
            axios.get.mockResolvedValue({ data: mockOrders });

            // Act
            render(<Orders />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
                expect(screen.getByText("Product 1")).toBeInTheDocument();
                expect(screen.getByText("Price : 100")).toBeInTheDocument();
            });
        });

        it("should render multiple orders correctly (BV: 2 orders)", async () => {
            // Arrange
            const mockOrders = [
                {
                    _id: "1",
                    status: "Processing",
                    buyer: { name: "John Doe" },
                    createdAt: new Date(),
                    payment: { success: true },
                    products: [
                        { _id: "p1", name: "Product 1", description: "Test description", price: 100 },
                    ],
                },
                {
                    _id: "2",
                    status: "Shipped",
                    buyer: { name: "Jane Doe" },
                    createdAt: new Date(),
                    payment: { success: false },
                    products: [
                        { _id: "p2", name: "Product 2", description: "Another description", price: 200 },
                    ],
                },
            ];
            useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
            axios.get.mockResolvedValue({ data: mockOrders });

            // Act
            render(<Orders />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText("John Doe")).toBeInTheDocument();
                expect(screen.getByText("Jane Doe")).toBeInTheDocument();
                expect(screen.getByText("Product 1")).toBeInTheDocument();
                expect(screen.getByText("Product 2")).toBeInTheDocument();
            });
        });

        it("should display payment success status correctly (EP: Successful payment)", async () => {
            // Arrange
            const mockOrders = [
                {
                    _id: "1",
                    status: "Processing",
                    buyer: { name: "John Doe" },
                    createdAt: new Date(),
                    payment: { success: true },
                    products: [],
                },
            ];
            useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
            axios.get.mockResolvedValue({ data: mockOrders });

            // Act
            render(<Orders />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText("Success")).toBeInTheDocument();
            });
        });

        it("should display payment failed status correctly (EP: Failed payment)", async () => {
            // Arrange
            const mockOrders = [
                {
                    _id: "1",
                    status: "Delivered",
                    buyer: { name: "Jane Doe" },
                    createdAt: new Date(),
                    payment: { success: false },
                    products: [],
                },
            ];
            useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
            axios.get.mockResolvedValue({ data: mockOrders });

            // Act
            render(<Orders />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText("Failed")).toBeInTheDocument();
            });
        });
    });
});