// Emberlynn Loo, A0255614E

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { CartProvider, useCart } from "client/src/context/cart";
import ProductDetails from "client/src/pages/ProductDetails";

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

jest.mock("react-hot-toast");

jest.mock("client/src/components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div>{children}</div>,
}));

const CartStateConsumer = () => {
    const [cart] = useCart();
    return <div data-testid="cart-size">{cart.length}</div>;
};

const mockProduct = {
    _id: "p1",
    name: "Test Product",
    description: "Test Description",
    price: 9,
    slug: "test-product",
    category: { _id: "c1", name: "Test Category" },
};

const mockRelatedProducts = [
    {
        _id: "p2",
        name: "Related Product",
        description: "Very very very very very long test description exceeding 60 characters",
        price: 67,
        slug: "related-product",
        category: { _id: "c1", name: "Test Category" },
    },
];

const renderProductDetails = (slug = "test-product") =>
    render(
        <CartProvider>
            <CartStateConsumer />
            <MemoryRouter initialEntries={[`/product/${slug}`]}>
                <Routes>
                    <Route path="/product/:slug" element={<ProductDetails />} />
                    <Route
                        path="*"
                        element={<div data-testid="other-page" />}
                    />
                </Routes>
            </MemoryRouter>
        </CartProvider>
    );

describe("ProductDetails integration with real CartProvider", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();

        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes("related-product")) {
                return Promise.resolve({ data: { products: mockRelatedProducts } });
            }
            return Promise.resolve({ data: {} });
        });
    });

    it("fetches and displays main product details based on URL slug", async () => {
        // Act
        renderProductDetails("test-product");

        // Assert
        await waitFor(() => {
            expect(screen.getByText("Name : Test Product")).toBeInTheDocument();
            expect(screen.getByText("Description : Test Description")).toBeInTheDocument();
            expect(screen.getByText("Category : Test Category")).toBeInTheDocument();
        });
        expect(axios.get).toHaveBeenCalledWith(
            "/api/v1/product/get-product/test-product"
        );
    });

    it("fetches and displays related products below main product", async () => {
        // Act
        renderProductDetails("test-product");

        // Assert
        await waitFor(() => {
            expect(screen.getByText("Related Product")).toBeInTheDocument();
        });
        expect(axios.get).toHaveBeenCalledWith(
            "/api/v1/product/related-product/p1/c1"
        );
    });

    it("shows no similar products message when related products list is empty", async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            return Promise.resolve({ data: { products: [] } });
        });

        // Act
        renderProductDetails("test-product");

        // Assert
        await waitFor(() => {
            expect(screen.getByText("No Similar Products found")).toBeInTheDocument();
        });
    });

    it("adds product to real cart context and localStorage when ADD TO CART button is clicked", async () => {
        // Arrange
        renderProductDetails("test-product");
        await waitFor(() => screen.getByText("Name : Test Product"));

        // Act
        fireEvent.click(screen.getByText("ADD TO CART"));

        // Assert 
        await waitFor(() => {
            expect(screen.getByTestId("cart-size").textContent).toBe("1");
        });

        const savedCart = JSON.parse(localStorage.getItem("cart"));
        expect(savedCart).toHaveLength(1);
        expect(savedCart[0]._id).toBe("p1");
        expect(savedCart[0].name).toBe("Test Product");
    });

    it("shows toast when ADD TO CART buttonis clicked", async () => {
        // Arrange
        renderProductDetails("test-product");
        await waitFor(() => screen.getByText("Name : Test Product"));

        // Act
        fireEvent.click(screen.getByText("ADD TO CART"));

        // Assert
        expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
    });

    it("navigates to related product page when More Details is clicked", async () => {
        // Arrange
        renderProductDetails("test-product");
        await waitFor(() => screen.getByText("Related Product"));

        // Act
        fireEvent.click(screen.getByText("More Details"));

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(
                "/api/v1/product/get-product/related-product"
            );
        });
    });

    it("handles getProduct API error gracefully without crashing", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.get.mockRejectedValueOnce(new Error("Network error"));

        // Act
        renderProductDetails("test-product");

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });
        expect(screen.getByText("Product Details")).toBeInTheDocument();
        consoleSpy.mockRestore();
    });

    it("handles getSimilarProduct API error gracefully without crashing", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            return Promise.reject(new Error("Related products fetch failed"));
        });

        // Act
        renderProductDetails("test-product");

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });
        expect(screen.getByText("Name : Test Product")).toBeInTheDocument();
        consoleSpy.mockRestore();
    });

    it("does not fetch product when slug is missing", async () => {
        // Arrange
        render(
            <CartProvider>
                <MemoryRouter initialEntries={["/product/"]}>
                    <Routes>
                        <Route path="/product/" element={<ProductDetails />} />
                    </Routes>
                </MemoryRouter>
            </CartProvider>
        );

        // Assert
        await waitFor(() => expect(axios.get).not.toHaveBeenCalled());
    });

});