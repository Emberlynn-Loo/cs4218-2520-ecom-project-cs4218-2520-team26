// Earnest Suprapmo, A0251966U
// Integration tests for HomePage with real CartProvider and mocked axios

import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";

import HomePage from "client/src/pages/HomePage";
import { useCart } from "client/src/context/cart";
import { renderWithProviders } from "../../helpers/renderWithProviders";
import { setupMockLocalStorage } from "../../helpers/mockLocalStorage";

jest.mock(
  "axios",
  () => ({
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      defaults: {
        headers: {
          common: {},
        },
      },
    },
  }),
  { virtual: true }
);

jest.mock("client/src/components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

const CartStateConsumer = () => {
  const [cart] = useCart();
  return <div data-testid="cart-size">{cart.length}</div>;
};

const renderHomePage = () =>
  renderWithProviders(
    <>
      <CartStateConsumer />
      <HomePage />
    </>
  );

describe("HomePage integration with real CartProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockLocalStorage();
  });

  it("fetches and renders products on page load", async () => {
    // Arrange
    const products = [
      {
        _id: "p1",
        name: "Product 1",
        description: "Desc 1",
        price: 10,
        slug: "product-1",
      },
      {
        _id: "p2",
        name: "Product 2",
        description: "Desc 2",
        price: 20,
        slug: "product-2",
      },
    ];
    const categories = [
      { _id: "c1", name: "Cat 1", slug: "cat-1" },
      { _id: "c2", name: "Cat 2", slug: "cat-2" },
    ];

    axios.get
      .mockResolvedValueOnce({
        data: { success: true, category: categories },
      })
      .mockResolvedValueOnce({
        data: { total: products.length },
      })
      .mockResolvedValueOnce({
        data: { products },
      });

    // Act
    renderHomePage();

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Product 1")).toBeInTheDocument();
      expect(screen.getByText("Product 2")).toBeInTheDocument();
    });
  });

  it('updates cart context and localStorage when "ADD TO CART" is clicked', async () => {
    // Arrange
    const products = [
      {
        _id: "p1",
        name: "Product 1",
        description: "Desc 1",
        price: 10,
        slug: "product-1",
      },
    ];

    axios.get
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      })
      .mockResolvedValueOnce({
        data: { total: products.length },
      })
      .mockResolvedValueOnce({
        data: { products },
      });

    // Act
    renderHomePage();

    await waitFor(() =>
      expect(screen.getByText("Product 1")).toBeInTheDocument()
    );

    expect(screen.getByTestId("cart-size").textContent).toBe("0");

    const addButton = screen.getByRole("button", { name: /add to cart/i });
    await userEvent.click(addButton);

    // Assert
    expect(screen.getByTestId("cart-size").textContent).toBe("1");
    const savedCart = JSON.parse(window.localStorage.getItem("cart"));
    expect(savedCart).toHaveLength(1);
    expect(savedCart[0]._id).toBe("p1");
  });

  it("accumulates multiple products in cart context", async () => {
    // Arrange
    const products = [
      {
        _id: "p1",
        name: "Product 1",
        description: "Desc 1",
        price: 10,
        slug: "product-1",
      },
      {
        _id: "p2",
        name: "Product 2",
        description: "Desc 2",
        price: 20,
        slug: "product-2",
      },
    ];

    axios.get
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      })
      .mockResolvedValueOnce({
        data: { total: products.length },
      })
      .mockResolvedValueOnce({
        data: { products },
      });

    // Act
    renderHomePage();

    await waitFor(() =>
      expect(screen.getByText("Product 1")).toBeInTheDocument()
    );

    const addButtons = screen.getAllByRole("button", {
      name: /add to cart/i,
    });

    await userEvent.click(addButtons[0]);
    await userEvent.click(addButtons[1]);

    // Assert
    expect(screen.getByTestId("cart-size").textContent).toBe("2");
    const savedCart = JSON.parse(window.localStorage.getItem("cart"));
    expect(savedCart).toHaveLength(2);
  });

  it('appends new products when "Loadmore" is clicked', async () => {
    // Arrange
    const firstPageProducts = [
      {
        _id: "p1",
        name: "Product 1",
        description: "Desc 1",
        price: 10,
        slug: "product-1",
      },
    ];
    const secondPageProducts = [
      {
        _id: "p2",
        name: "Product 2",
        description: "Desc 2",
        price: 20,
        slug: "product-2",
      },
    ];

    axios.get
      .mockResolvedValueOnce({
        data: { success: true, category: [] },
      })
      .mockResolvedValueOnce({
        data: { total: 2 },
      })
      .mockResolvedValueOnce({
        data: { products: firstPageProducts },
      })
      .mockResolvedValueOnce({
        data: { products: secondPageProducts },
      });

    // Act
    renderHomePage();

    await waitFor(() =>
      expect(screen.getByText("Product 1")).toBeInTheDocument()
    );
    expect(screen.queryByText("Product 2")).toBeNull();

    const loadMoreButton = screen.getByRole("button", { name: /loadmore/i });
    await userEvent.click(loadMoreButton);

    // Assert
    await waitFor(() =>
      expect(screen.getByText("Product 2")).toBeInTheDocument()
    );
  });

  it("sends selected category IDs in filter API call", async () => {
    // Arrange
    const categories = [
      { _id: "c1", name: "Cat 1", slug: "cat-1" },
      { _id: "c2", name: "Cat 2", slug: "cat-2" },
    ];

    axios.get
      .mockResolvedValueOnce({
        data: { success: true, category: categories },
      })
      .mockResolvedValueOnce({
        data: { total: 0 },
      })
      .mockResolvedValueOnce({
        data: { products: [] },
      });

    axios.post.mockResolvedValueOnce({
      data: { products: [] },
    });

    // Act
    renderHomePage();

    const cat1Checkbox = await screen.findByLabelText("Cat 1");
    await userEvent.click(cat1Checkbox);

    // Assert
    expect(axios.post).toHaveBeenCalledWith(
      "/api/v1/product/product-filters",
      expect.objectContaining({
        checked: expect.arrayContaining(["c1"]),
      })
    );
  });
});
