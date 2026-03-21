// Ashley Chang Le Xuan, A0252633J
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import moment from "moment";

import Orders from "../../pages/user/Orders";
import { AuthProvider } from "../../context/auth";

jest.mock("axios");

jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

const setupLocalStorage = () => {
  let store = {};
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: jest.fn((key) => (key in store ? store[key] : null)),
      setItem: jest.fn((key, value) => {
        store[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
    },
    writable: true,
    configurable: true,
  });
};

const setAuthInStorage = (authData) => {
  window.localStorage.setItem("auth", JSON.stringify(authData));
};

const renderOrdersWithAuthProvider = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Orders />
      </AuthProvider>
    </MemoryRouter>
  );

describe("Orders integration with real AuthProvider and mocked axios boundary", () => {
  const orderDate = "2026-03-20T12:00:00.000Z";

  const ordersPayload = [
    {
      _id: "order-1",
      status: "Processing",
      buyer: { name: "John Doe" },
      createdAt: orderDate,
      payment: { success: true },
      products: [
        {
          _id: "p1",
          name: "Mechanical Keyboard",
          description: "High quality mechanical keyboard with RGB lighting",
          price: 129,
        },
        {
          _id: "p2",
          name: "Gaming Mouse",
          description: "Ergonomic wireless gaming mouse",
          price: 69,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    setupLocalStorage();
    axios.defaults = { headers: { common: {} } };
  });

  describe("EP - Auth token partitions", () => {
    it("EP: when auth token exists, fetches orders on mount and renders order table details", async () => {
      // Arrange
      setAuthInStorage({
        user: { _id: "u1", name: "John Doe" },
        token: "valid-token",
      });
      axios.get.mockResolvedValueOnce({ data: ordersPayload });

      // Act
      renderOrdersWithAuthProvider();

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
      });

      expect(await screen.findByText("Processing")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText(moment(orderDate).fromNow())).toBeInTheDocument();
      expect(screen.getByText("Success")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("EP: when auth token is absent, does not call orders API and renders no order rows", async () => {
      // Arrange
      setAuthInStorage({
        user: { _id: "u2", name: "Guest User" },
        token: "",
      });

      // Act
      renderOrdersWithAuthProvider();

      // Assert
      await waitFor(() => {
        expect(screen.getByText("All Orders")).toBeInTheDocument();
      });
      expect(axios.get).not.toHaveBeenCalled();
      expect(screen.queryByText("Processing")).not.toBeInTheDocument();
      expect(screen.queryByText("Success")).not.toBeInTheDocument();
    });
  });

  it("renders products with image URL, name, truncated description, and price", async () => {
    // Arrange
    setAuthInStorage({
      user: { _id: "u1", name: "John Doe" },
      token: "valid-token",
    });
    axios.get.mockResolvedValueOnce({ data: ordersPayload });

    // Act
    renderOrdersWithAuthProvider();

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Mechanical Keyboard")).toBeInTheDocument();
      expect(screen.getByText("Gaming Mouse")).toBeInTheDocument();
    });

    expect(
      screen.getByText(ordersPayload[0].products[0].description.substring(0, 30))
    ).toBeInTheDocument();
    expect(
      screen.getByText(ordersPayload[0].products[1].description.substring(0, 30))
    ).toBeInTheDocument();
    expect(screen.getByText("Price : 129")).toBeInTheDocument();
    expect(screen.getByText("Price : 69")).toBeInTheDocument();

    const keyboardImage = screen.getByRole("img", { name: "Mechanical Keyboard" });
    const mouseImage = screen.getByRole("img", { name: "Gaming Mouse" });
    expect(keyboardImage).toHaveAttribute("src", "/api/v1/product/product-photo/p1");
    expect(mouseImage).toHaveAttribute("src", "/api/v1/product/product-photo/p2");
  });

  it("renders real UserMenu links correctly alongside orders", async () => {
    // Arrange
    setAuthInStorage({
      user: { _id: "u1", name: "John Doe" },
      token: "valid-token",
    });
    axios.get.mockResolvedValueOnce({ data: ordersPayload });

    // Act
    renderOrdersWithAuthProvider();

    // Assert
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      "/dashboard/user/profile"
    );
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute(
      "href",
      "/dashboard/user/orders"
    );
  });

  describe("EP - API outcome partitions", () => {
    it("EP: renders payment status classes for success and failure orders", async () => {
      // Arrange
      setAuthInStorage({
        user: { _id: "u3", name: "Buyer" },
        token: "valid-token",
      });
      axios.get.mockResolvedValueOnce({
        data: [
          {
            _id: "order-success",
            status: "Delivered",
            buyer: { name: "Buyer" },
            createdAt: orderDate,
            payment: { success: true },
            products: [],
          },
          {
            _id: "order-failed",
            status: "Cancelled",
            buyer: { name: "Buyer" },
            createdAt: orderDate,
            payment: { success: false },
            products: [],
          },
        ],
      });

      // Act
      renderOrdersWithAuthProvider();

      // Assert
      await waitFor(() => {
        expect(screen.getByText("Success")).toBeInTheDocument();
        expect(screen.getByText("Failed")).toBeInTheDocument();
      });
    });

    it("EP: API rejection keeps page stable and does not render order rows", async () => {
      // Arrange
      setAuthInStorage({
        user: { _id: "u4", name: "Error User" },
        token: "valid-token",
      });
      axios.get.mockRejectedValueOnce(new Error("Orders API failed"));
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      // Act
      renderOrdersWithAuthProvider();

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
      });
      expect(screen.getByText("All Orders")).toBeInTheDocument();
      expect(screen.queryByText("Processing")).not.toBeInTheDocument();
      expect(screen.queryByText("Success")).not.toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });
});
