import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import AdminOrders from "./AdminOrders";
import { useAuth } from "../../context/auth";

//Emberlynn Loo, A0255614E

jest.mock("axios");

jest.mock("../../context/auth", () => ({
    useAuth: jest.fn(),
}));

jest.mock("../../components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div>{children}</div>,
}));

jest.mock("../../components/AdminMenu", () => ({
    __esModule: true,
    default: () => <div>AdminMenu</div>,
}));

jest.mock("moment", () => {
    const moment = () => ({
        fromNow: () => "2 days ago",
    });
    return moment;
});

jest.mock("antd", () => {
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
});

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
                description: "Test Description",
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
                description: "Diff Test Description",
                price: 55,
            },
        ],
    },
];

describe("AdminOrders", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        axios.get.mockResolvedValue({ data: mockOrders });
        axios.put.mockResolvedValue({ data: { success: true } });
    });

    it("renders page with heading", () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        //Act
        render(<AdminOrders />);

        //Assert
        expect(screen.getByText("All Orders")).toBeInTheDocument();
        expect(screen.getByText("AdminMenu")).toBeInTheDocument();
    });

    it("fetches and displays orders when auth token exists", async () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        //Act
        render(<AdminOrders />);

        //Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
        });

        await waitFor(() => {
            expect(screen.getByText("John Doe")).toBeInTheDocument();
            expect(screen.getByText("Jane Doe")).toBeInTheDocument();
        });
    });

    it("does not fetch orders when no auth token", async () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "" }, jest.fn()]);

        //Act
        render(<AdminOrders />);

        //Assert
        await waitFor(() => {
            expect(axios.get).not.toHaveBeenCalled();
        });
    });

    it("does not fetch orders when auth is null", async () => {
        //Arrange
        useAuth.mockReturnValue([null, jest.fn()]);

        //Act

        render(<AdminOrders />);
        //Assert
        expect(axios.get).not.toHaveBeenCalled();
    });

    it("displays order products correctly", async () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        //Act
        render(<AdminOrders />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("Product 1")).toBeInTheDocument();
            expect(screen.getByText("Product 2")).toBeInTheDocument();
            expect(screen.getByText("Price : 99")).toBeInTheDocument();
            expect(screen.getByText("Price : 55")).toBeInTheDocument();
        });
    });

    it("shows Success for successful payment", async () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        //Act
        render(<AdminOrders />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("Success")).toBeInTheDocument();
        });
    });

    it("shows Failed for unsuccessful payment", async () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        //Act
        render(<AdminOrders />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("Failed")).toBeInTheDocument();
        });
    });

    it("shows date using moment fromNow", async () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        //Act
        render(<AdminOrders />);

        //Assert
        await waitFor(() => {
            const dates = screen.getAllByText("2 days ago");
            expect(dates.length).toBeGreaterThan(0);
        });
    });

    it("shows product quantity", async () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        //Act
        render(<AdminOrders />);

        //Assert
        await waitFor(() => {
            const ones = screen.getAllByText("1");
            expect(ones.length).toBeGreaterThan(0);
        });
    });

    it("handleChange calls put API when status changed", async () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        render(<AdminOrders />);

        await waitFor(() => screen.getByText("John Doe"));
        const selects = screen.getAllByRole("combobox");

        //Act
        fireEvent.change(selects[0], { target: { value: "Shipped" } });

        //Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                "/api/v1/auth/order-status/o1",
                { status: "Shipped" }
            );
        });
    });

    it("fetches orders again after status change", async () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        render(<AdminOrders />);

        await waitFor(() => screen.getByText("John Doe"));
        const selects = screen.getAllByRole("combobox");

        //Act
        fireEvent.change(selects[0], { target: { value: "Shipped" } });

        //Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledTimes(2);
        });
    });

    it("logs error when getOrders fails", async () => {
        //Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        axios.get.mockRejectedValueOnce(new Error("fetch failed"));

        //Act
        render(<AdminOrders />);

        //Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });
        consoleSpy.mockRestore();
    });

    it("logs error when handleChange fails", async () => {
        //Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
        axios.put.mockRejectedValueOnce(new Error("update failed"));

        render(<AdminOrders />);

        await waitFor(() => screen.getByText("John Doe"));
        const selects = screen.getAllByRole("combobox");

        //Act
        fireEvent.change(selects[0], { target: { value: "Shipped" } });

        //Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });
        consoleSpy.mockRestore();
    });
});