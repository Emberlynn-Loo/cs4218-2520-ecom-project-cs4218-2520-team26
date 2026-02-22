import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import CartPage from "./CartPage";

// Earnest Suprapmo, A0251966U
jest.mock("axios");
jest.mock("react-hot-toast");

// Mock cart
const mockUseCart = jest.fn();
jest.mock("../context/cart", () => ({
  useCart: () => mockUseCart(),
}));

const mockUseAuth = jest.fn();
jest.mock("../context/auth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock Braintree DropIn component
const mockDropInInstance = {
  requestPaymentMethod: jest.fn(),
};

jest.mock("braintree-web-drop-in-react", () => {
  const React = require("react");
  return function DropInMock({ onInstance }) {
    React.useEffect(() => {
      if (onInstance) {
        onInstance(mockDropInInstance);
      }
    }, [onInstance]);
    return <div data-testid="dropin" />;
  };
});

// Mock icons
jest.mock("react-icons/ai", () => ({
  AiFillWarning: () => <span>warning-icon</span>,
}));

jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

// mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("CartPage", () => {
  const defaultCart = [
    {
      _id: "p1",
      name: "Product 1",
      description: "First product description",
      price: 10,
    },
    {
      _id: "p2",
      name: "Product 2",
      description: "Second product description",
      price: 20,
    },
  ];

  const setupLoggedInUserWithCart = (overrides = {}) => {
    const auth = {
      user: { name: "John Doe", address: "123 Main St" },
      token: "test-token",
      ...overrides.auth,
    };
    const cart = overrides.cart || defaultCart;

    const setAuth = jest.fn();
    const setCart = jest.fn();

    mockUseAuth.mockReturnValue([auth, setAuth]);
    mockUseCart.mockReturnValue([cart, setCart]);

    return { auth, cart, setAuth, setCart };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.removeItem.mockReset();

    mockDropInInstance.requestPaymentMethod.mockReset();
    mockDropInInstance.requestPaymentMethod.mockResolvedValue({
      nonce: "test-nonce",
    });

    axios.get.mockResolvedValue({
      data: { clientToken: "test-client-token" },
    });
    axios.post.mockResolvedValue({ data: { success: true } });
  });

  it("renders greeting, cart items and total for a logged-in user", async () => {
    // Arrange
    setupLoggedInUserWithCart();

    // Act
    render(<CartPage />);

    // Assert
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/braintree/token"
      )
    );

    expect(
      screen.getByText(/Hello\s+John Doe/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You Have 2 items in your cart/)
    ).toBeInTheDocument();
    expect(screen.getByText("Product 1")).toBeInTheDocument();
    expect(screen.getByText("Product 2")).toBeInTheDocument();
    expect(screen.getByText("Total : $30.00")).toBeInTheDocument();
  });

  it("logs an error when totalPrice formatting fails but does not break rendering", async () => {
    // Arrange
    setupLoggedInUserWithCart();
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const toLocaleSpy = jest
      .spyOn(Number.prototype, "toLocaleString")
      .mockImplementation(() => {
        throw new Error("formatting error");
      });

    // Act
    render(<CartPage />);

    // Assert
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/braintree/token"
      )
    );
    expect(consoleSpy).toHaveBeenCalled();

    toLocaleSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it("removes an item from the cart and updates localStorage", async () => {
    // Arrange
    const { setCart } = setupLoggedInUserWithCart();

    render(<CartPage />);

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/braintree/token"
      )
    );

    const removeButtons = screen.getAllByText("Remove");

    // Act
    fireEvent.click(removeButtons[0]);

    // Assert
    expect(setCart).toHaveBeenCalledWith([defaultCart[1]]);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "cart",
      JSON.stringify([defaultCart[1]])
    );
  });

  it("logs an error when removing an item fails", async () => {
    // Arrange
    setupLoggedInUserWithCart();
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error("storage error");
    });

    render(<CartPage />);

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/braintree/token"
      )
    );

    const removeButtons = screen.getAllByText("Remove");

    // Act
    fireEvent.click(removeButtons[0]);

    // Assert
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("logs an error when fetching client token fails", async () => {
    // Arrange
    setupLoggedInUserWithCart();
    const error = new Error("token error");
    axios.get.mockRejectedValueOnce(error);
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    render(<CartPage />);

    // Assert
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/braintree/token"
      )
    );
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("shows payment UI when client token, auth token and cart items are present", async () => {
    // Arrange
    setupLoggedInUserWithCart();

    // Act
    render(<CartPage />);

    // Assert
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/braintree/token"
      );
      expect(screen.getByTestId("dropin")).toBeInTheDocument();
      const makePaymentButton = screen.getByRole("button", {
        name: /make payment/i,
      });
      expect(makePaymentButton).not.toBeDisabled();
    });
  });

  it("completes payment and clears cart on successful payment", async () => {
    // Arrange
    const { cart, setCart } = setupLoggedInUserWithCart();

    render(<CartPage />);

    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /make payment/i });
      expect(btn).toBeInTheDocument();
      expect(btn).not.toBeDisabled();
    });

    const makePaymentButton = screen.getByRole("button", {
      name: /make payment/i,
    });

    // Act
    await act(async () => {
      fireEvent.click(makePaymentButton);
    });

    // Assert
    expect(mockDropInInstance.requestPaymentMethod).toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith(
      "/api/v1/product/braintree/payment",
      {
        nonce: "test-nonce",
        cart,
      }
    );

    expect(localStorageMock.removeItem).toHaveBeenCalledWith("cart");
    expect(setCart).toHaveBeenCalledWith([]);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
    expect(toast.success).toHaveBeenCalledWith(
      "Payment Completed Successfully "
    );
  });

  it("logs an error and resets loading state when payment fails", async () => {
    // Arrange
    const { cart } = setupLoggedInUserWithCart();
    axios.post.mockRejectedValueOnce(new Error("payment error"));
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    render(<CartPage />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /make payment/i })
      ).toBeInTheDocument()
    );

    const makePaymentButton = screen.getByRole("button", {
      name: /make payment/i,
    });

    // Act
    await act(async () => {
      fireEvent.click(makePaymentButton);
    });

    // Assert
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/braintree/payment",
        {
          nonce: "test-nonce",
          cart,
        }
      )
    );
    expect(consoleSpy).toHaveBeenCalled();
    expect(makePaymentButton).toHaveTextContent("Make Payment");

    consoleSpy.mockRestore();
  });

  it("prompts guest users to login to checkout", async () => {
    // Arrange
    const auth = { user: null, token: "" };
    const setAuth = jest.fn();
    const cart = defaultCart;
    const setCart = jest.fn();

    mockUseAuth.mockReturnValue([auth, setAuth]);
    mockUseCart.mockReturnValue([cart, setCart]);

    // Act
    render(<CartPage />);

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/braintree/token"
      )
    );

    // Assert
    expect(screen.getByText("Hello Guest")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You Have 2 items in your cart please login to checkout !"
      )
    ).toBeInTheDocument();

    const loginButton = screen.getByRole("button", {
      name: /Please Login to checkout/i,
    });
    fireEvent.click(loginButton);
    expect(mockNavigate).toHaveBeenCalledWith("/login", {
      state: "/cart",
    });
  });

  it("navigates to profile when Update Address is clicked for a user with address", async () => {
    // Arrange
    setupLoggedInUserWithCart();

    // Act
    render(<CartPage />);

    // Assert
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/braintree/token"
      )
    );

    const updateAddressButton = screen.getByRole("button", {
      name: /update address/i,
    });

    fireEvent.click(updateAddressButton);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("disables Make Payment button when user has no address", async () => {
    // Arrange
    setupLoggedInUserWithCart({
      auth: {
        user: { name: "John Doe", address: "" },
      },
    });

    // Act
    render(<CartPage />);

    // Assert
    await waitFor(() =>
      expect(screen.getByTestId("dropin")).toBeInTheDocument()
    );

    const makePaymentButton = screen.getByRole("button", {
      name: /make payment/i,
    });
    expect(makePaymentButton).toBeDisabled();

    const updateAddressButton = screen.getByRole("button", {
      name: /update address/i,
    });
    fireEvent.click(updateAddressButton);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/profile");
  });

  it("shows empty cart message when there are no items", async () => {
    // Arrange
    const auth = { user: { name: "John Doe" }, token: "test-token" };
    const setAuth = jest.fn();
    const cart = [];
    const setCart = jest.fn();

    mockUseAuth.mockReturnValue([auth, setAuth]);
    mockUseCart.mockReturnValue([cart, setCart]);

    // Act
    render(<CartPage />);

    // Assert
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/braintree/token"
      )
    );
    expect(
      screen.getByText(/Your Cart Is Empty/i)
    ).toBeInTheDocument();
  });
});
