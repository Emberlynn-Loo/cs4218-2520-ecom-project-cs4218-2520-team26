// Emberlynn Loo, A0255614E

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import { AuthProvider } from "client/src/context/auth";
import AdminOrders from "client/src/pages/admin/AdminOrders";

jest.mock(
    "axios",
    () => ({
        __esModule: true,
        default: {
            get: jest.fn(),
            put: jest.fn(),
            defaults: { headers: { common: {} } },
        },
    }),
    { virtual: true }
);

jest.mock("react-hot-toast");

jest.mock("client/src/components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div>{children}</div>,
}));

jest.mock(
    "moment",
    () => {
        const moment = () => ({ fromNow: () => "2 days ago" });
        return moment;
    },
    { virtual: true }
);

jest.mock(
    "antd",
    () => {
        const Select = ({ children, onChange, defaultValue }) => (
            <select
                defaultValue={defaultValue}
                onChange={(e) => onChange && onChange(e.target.value)}
            >
                {children}
            </select>
        );
        Select.Option = ({ value, children }) => (
            <option value={value}>{children}</option>
        );
        return { Select };
    },
    { virtual: true }
);

const mockOrders = [
    {
        _id: "o1",
        status: "Not Processed",
        buyer: { name: "John Doe" },
        createdAt: "2024-01-01",
        payment: { success: true },
        products: [
            {
                _id: "p1",
                name: "Product 1",
                description: "Test Description for product one",
                price: 99,
            },
        ],
    },
    {
        _id: "o2",
        status: "Delivered",
        buyer: { name: "Jane Doe" },
        createdAt: "2024-01-02",
        payment: { success: false },
        products: [
            {
                _id: "p2",
                name: "Product 2",
                description: "Test Description for product two",
                price: 55,
            },
        ],
    },
];

// Helper to render with real AuthProvider and seed localStorage
const renderAdminOrders = (authData = null) => {
    if (authData) {
        localStorage.setItem("auth", JSON.stringify(authData));
    } else {
        localStorage.clear();
    }
    return render(
        <AuthProvider>
            <MemoryRouter>
                <AdminOrders />
            </MemoryRouter>
        </AuthProvider>
    );
};

describe("AdminOrders integration with real AuthProvider", () => {

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        axios.get.mockResolvedValue({ data: mockOrders });
        axios.put.mockResolvedValue({ data: { success: true } });
    });

    it("renders page heading and real AdminMenu when authenticated", async () => {
        // Arrange + Act
        renderAdminOrders({ user: { name: "Admin" }, token: "test-token" });

        // Assert
        await waitFor(() => {
            expect(screen.getByText("All Orders")).toBeInTheDocument();
        });
        // Real AdminMenu links
        expect(screen.getByText("Admin Panel")).toBeInTheDocument();
        expect(screen.getByText("Create Category")).toBeInTheDocument();
        expect(screen.getByText("Orders")).toBeInTheDocument();
    });

    it("fetches and displays orders when admin is authenticated via real AuthProvider", async () => {
        // Arrange + Act
        renderAdminOrders({ user: { name: "Admin" }, token: "test-token" });

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
        });
        await waitFor(() => {
            expect(screen.getByText("John Doe")).toBeInTheDocument();
            expect(screen.getByText("Jane Doe")).toBeInTheDocument();
        });
    });

    it("displays order table with buyer name, date, payment info and quantity", async () => {
        // Arrange + Act
        renderAdminOrders({ user: { name: "Admin" }, token: "test-token" });

        // Assert
        await waitFor(() => {
            expect(screen.getByText("John Doe")).toBeInTheDocument();
            expect(screen.getByText("Jane Doe")).toBeInTheDocument();
            expect(screen.getAllByText("2 days ago")).toHaveLength(2);
            expect(screen.getByText("Success")).toBeInTheDocument();
            expect(screen.getByText("Failed")).toBeInTheDocument();
            // verify quantity column header exists
            expect(screen.getAllByText("Quantity")).toHaveLength(2);
        });
    });

    it("displays order products with name, description, price and image", async () => {
        // Arrange + Act
        renderAdminOrders({ user: { name: "Admin" }, token: "test-token" });

        // Assert
        await waitFor(() => {
            expect(screen.getByText("Product 1")).toBeInTheDocument();
            expect(screen.getByText("Product 2")).toBeInTheDocument();
            expect(screen.getByText("Price : 99")).toBeInTheDocument();
            expect(screen.getByText("Price : 55")).toBeInTheDocument();
        });

        const images = screen.getAllByRole("img");
        expect(images[0]).toHaveAttribute(
            "src",
            "/api/v1/product/product-photo/p1"
        );
    });

    it("does not fetch orders when auth token is absent", async () => {
        // Arrange + Act - no token in localStorage
        renderAdminOrders(null);

        // Assert
        await waitFor(() => {
            expect(axios.get).not.toHaveBeenCalled();
        });
    });

    it("does not fetch orders when auth token is empty string", async () => {
        // Arrange + Act
        renderAdminOrders({ user: { name: "Admin" }, token: "" });

        // Assert
        await waitFor(() => {
            expect(axios.get).not.toHaveBeenCalled();
        });
    });

    it("calls axios.put with correct order ID and status when dropdown changes", async () => {
        // Arrange
        renderAdminOrders({ user: { name: "Admin" }, token: "test-token" });
        await waitFor(() => screen.getByText("John Doe"));

        const selects = screen.getAllByRole("combobox");

        // Act
        fireEvent.change(selects[0], { target: { value: "Shipped" } });

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                "/api/v1/auth/order-status/o1",
                { status: "Shipped" }
            );
        });
    });

    it("re-fetches orders after status change", async () => {
        // Arrange
        renderAdminOrders({ user: { name: "Admin" }, token: "test-token" });
        await waitFor(() => screen.getByText("John Doe"));
        const selects = screen.getAllByRole("combobox");

        // Act
        fireEvent.change(selects[0], { target: { value: "Shipped" } });

        // Assert - called twice: once on mount, once after status change
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledTimes(2);
        });
    });

    it("handles getOrders error gracefully without crashing", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.get.mockRejectedValueOnce(new Error("fetch failed"));

        // Act
        renderAdminOrders({ user: { name: "Admin" }, token: "test-token" });

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });
        expect(screen.getByText("All Orders")).toBeInTheDocument();
        consoleSpy.mockRestore();
    });

    it("handles handleChange error gracefully without crashing", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.put.mockRejectedValueOnce(new Error("update failed"));
        renderAdminOrders({ user: { name: "Admin" }, token: "test-token" });
        await waitFor(() => screen.getByText("John Doe"));
        const selects = screen.getAllByRole("combobox");

        // Act
        fireEvent.change(selects[0], { target: { value: "Shipped" } });

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });
        consoleSpy.mockRestore();
    });

});