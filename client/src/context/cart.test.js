import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CartProvider, useCart } from "./cart";

// Earnest Suprapmo, A0251966U
// mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
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
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

const CartConsumerTestComponent = () => {
  const [cart, setCart] = useCart();

  const handleAddItem = () => {
    setCart([{ id: 1, name: "Test item" }]);
  };

  return (
    <div>
      <span data-testid="cart-length">{cart.length}</span>
      <span data-testid="cart-json">{JSON.stringify(cart)}</span>
      <button onClick={handleAddItem}>Add Item</button>
    </div>
  );
};

describe("CartContext / CartProvider", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it("clears invalid cart data from localStorage and falls back to empty cart", () => {
    // Arrange
    const error = new Error("invalid json");
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw error;
    });

    // Act
    render(
      <CartProvider>
        <CartConsumerTestComponent />
      </CartProvider>
    );

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to parse cart from localStorage:",
      error
    );
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("cart");
    expect(screen.getByTestId("cart-length").textContent).toBe("0");
    expect(screen.getByTestId("cart-json").textContent).toBe("[]");

    consoleSpy.mockRestore();
  });

  it("initializes with an empty cart when localStorage has no cart data", () => {
    // Arrange
    localStorageMock.getItem.mockReturnValueOnce(null);

    // Act
    render(
      <CartProvider>
        <CartConsumerTestComponent />
      </CartProvider>
    );

    // Assert
    expect(localStorageMock.getItem).toHaveBeenCalledWith("cart");
    expect(screen.getByTestId("cart-length").textContent).toBe("0");
    expect(screen.getByTestId("cart-json").textContent).toBe("[]");
  });

  it("loads initial cart state from localStorage when data exists", () => {
    // Arrange
    const storedCart = [{ id: 1, name: "Stored item" }];
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedCart));

    // Act
    render(
      <CartProvider>
        <CartConsumerTestComponent />
      </CartProvider>
    );

    // Assert
    expect(localStorageMock.getItem).toHaveBeenCalledWith("cart");
    expect(screen.getByTestId("cart-length").textContent).toBe("1");
    expect(screen.getByTestId("cart-json").textContent).toBe(
      JSON.stringify(storedCart)
    );
  });

  it("provides setCart so consumers can update the cart", () => {
    // Arrange
    localStorageMock.getItem.mockReturnValueOnce(null);

    // Act
    render(
      <CartProvider>
        <CartConsumerTestComponent />
      </CartProvider>
    );

    const button = screen.getByText("Add Item");
    fireEvent.click(button);

    // Assert
    expect(screen.getByTestId("cart-length").textContent).toBe("1");
    expect(screen.getByTestId("cart-json").textContent).toBe(
      JSON.stringify([{ id: 1, name: "Test item" }])
    );
  });
});
