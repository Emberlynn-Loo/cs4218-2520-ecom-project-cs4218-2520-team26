import React from "react";
import { screen, fireEvent, waitFor, render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";

jest.mock(
  "axios",
  () => ({
    __esModule: true,
    default: {
      get: jest.fn(),
      defaults: {
        headers: {
          common: {},
        },
      },
    },
  }),
  { virtual: true }
);

jest.mock("client/src/components/Form/SearchInput", () => () => (
  <div data-testid="search-input">SearchInput</div>
));

jest.mock(
    "antd",
    () => ({
        Badge: ({ count, children }) => (
            <div data-testid="badge" data-count={count}>
                {children}
            </div>
        ),
    }),
    { virtual: true }
);

jest.mock(
    "react-hot-toast",
    () => ({
        __esModule: true,
        default: {
            success: jest.fn(),
        },
        Toaster: () => <div data-testid="toaster">Toaster</div>,
    }),
    { virtual: true }
);

import Layout from "client/src/components/Layout";
import { AuthProvider } from "client/src/context/auth";
import { CartProvider } from "client/src/context/cart";
import { renderWithProviders } from "../../helpers/renderWithProviders";
import { setupMockLocalStorage } from "../../helpers/mockLocalStorage";
import { mockCategoryApi } from "../../helpers/mockCategoryApi";
import toast from "react-hot-toast";

describe("Layout + Header + Footer Integration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Khoo Jing Xiang, A0252605L
    it("should render real Header, Footer, Toaster and children for guest users", async () => {
        // Arrange
        setupMockLocalStorage({
            cart: [],
        });
        mockCategoryApi([]);

        // Act
        renderWithProviders(
            <Layout>
                <div data-testid="child">Hello Integration</div>
            </Layout>
        );

        // Assert
        expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument();
        expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
        expect(screen.getByTestId("toaster")).toBeInTheDocument();
        expect(screen.getByTestId("search-input")).toBeInTheDocument();
        expect(screen.getByTestId("child")).toHaveTextContent("Hello Integration");
    });

    // Khoo Jing Xiang, A0252605L
    it("should set document title through Layout props", async () => {
        // Arrange
        setupMockLocalStorage({
            cart: [],
        });
        mockCategoryApi([]);

        // Act
        renderWithProviders(
            <Layout title="Integrated Page Title">
                <div>Page Content</div>
            </Layout>
        );

        // Assert
        await waitFor(() => {
            expect(document.title).toBe("Integrated Page Title");
        });
    });

    // Khoo Jing Xiang, A0252605L
    it("should render guest navigation, fetched categories, and cart badge count inside Layout", async () => {
        // Arrange
        setupMockLocalStorage({
            cart: [{ id: 1 }, { id: 2 }],
        });

        const getCategoriesSpy = mockCategoryApi([
            { name: "Mice", slug: "mice" },
            { name: "Keyboards", slug: "keyboards" },
        ]);

        // Act
        renderWithProviders(
            <Layout>
                <div>Guest Page</div>
            </Layout>
        );

        // Assert
        expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();

        expect(
            screen.getByRole("link", { name: /^categories$/i })
        ).toBeInTheDocument();

        expect(
            await screen.findByRole("link", { name: /all categories/i })
        ).toHaveAttribute("href", "/categories");

        expect(await screen.findByRole("link", { name: /mice/i })).toHaveAttribute(
            "href",
            "/category/mice"
        );

        expect(
            await screen.findByRole("link", { name: /keyboards/i })
        ).toHaveAttribute("href", "/category/keyboards");

        await waitFor(() => {
            expect(screen.getByTestId("badge")).toHaveAttribute("data-count", "2");
        });

        expect(getCategoriesSpy).toHaveBeenCalledWith(
            "/api/v1/category/get-category"
        );
    });

    // Khoo Jing Xiang, A0252605L
    it("should render Footer links correctly inside Layout", async () => {
        // Arrange
        setupMockLocalStorage({
            cart: [],
        });
        mockCategoryApi([]);

        // Act
        renderWithProviders(
            <Layout>
                <div>Footer Test Page</div>
            </Layout>
        );

        // Assert
        expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute(
            "href",
            "/about"
        );
        expect(screen.getByRole("link", { name: /contact/i })).toHaveAttribute(
            "href",
            "/contact"
        );
        expect(
            screen.getByRole("link", { name: /privacy policy/i })
        ).toHaveAttribute("href", "/policy");
    });

    // Khoo Jing Xiang, A0252605L
    it("should render authenticated user flow through real Layout and real Header", async () => {
        // Arrange
        setupMockLocalStorage({
            auth: {
                user: { name: "John", role: 0 },
                token: "abc123",
            },
            cart: [{ id: 1 }],
        });

        mockCategoryApi([{ name: "Mice", slug: "mice" }]);

        // Act
        renderWithProviders(
            <Layout>
                <div>Protected Content</div>
            </Layout>
        );

        // Assert
        expect(await screen.findByText("John")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
            "href",
            "/dashboard/user"
        );
        expect(screen.getByRole("link", { name: /logout/i })).toBeInTheDocument();

        expect(
            screen.queryByRole("link", { name: /register/i })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("link", { name: /login/i })
        ).not.toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByTestId("badge")).toHaveAttribute("data-count", "1");
        });
    });

    // Khoo Jing Xiang, A0252605L
    it("should logout correctly through real Header when rendered inside Layout", async () => {
        // Arrange
        setupMockLocalStorage({
            auth: {
                user: { name: "Admin", role: 1 },
                token: "token123",
            },
            cart: [],
        });

        mockCategoryApi([]);

        // Act
        renderWithProviders(
            <Layout>
                <div>Admin Page</div>
            </Layout>
        );

        expect(await screen.findByText("Admin")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
            "href",
            "/dashboard/admin"
        );

        fireEvent.click(screen.getByRole("link", { name: /logout/i }));

        // Assert
        expect(window.localStorage.removeItem).toHaveBeenCalledWith("auth");
        expect(toast.success).toHaveBeenCalledWith("Logout Successfully");

        await waitFor(() => {
            expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
        });

        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    });

    // Khoo Jing Xiang, A0252605L
    it("should navigate using real Footer links with router integration", async () => {
        // Arrange
        setupMockLocalStorage({
            cart: [],
        });

        mockCategoryApi([]);

        // Act
        render(
            <MemoryRouter initialEntries={["/"]}>
                <AuthProvider>
                    <CartProvider>
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <Layout>
                                        <div>Home Page</div>
                                    </Layout>
                                }
                            />
                            <Route path="/about" element={<div>About Page</div>} />
                            <Route path="/contact" element={<div>Contact Page</div>} />
                            <Route path="/policy" element={<div>Privacy Policy Page</div>} />
                        </Routes>
                    </CartProvider>
                </AuthProvider>
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole("link", { name: /about/i }));

        // Assert
        await waitFor(() => {
            expect(screen.getByText("About Page")).toBeInTheDocument();
        });
    });

});
