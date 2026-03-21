import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

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
  }),
  { virtual: true }
);

import Header from "client/src/components/Header";
import { renderWithProviders } from "../../helpers/renderWithProviders";
import { setupMockLocalStorage } from "../../helpers/mockLocalStorage";
import { mockCategoryApi } from "../../helpers/mockCategoryApi";
import toast from "react-hot-toast";

describe("Header + AuthProvider + CartProvider + useCategory Integration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Khoo Jing Xiang, A0252605L
    it("should render Register and Login links when not authenticated", async () => {
        // Arrange
        setupMockLocalStorage({
            cart: [],
        });
        mockCategoryApi([]);

        // Act
        renderWithProviders(<Header />);

        // Assert
        expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument();
        expect(screen.getByTestId("search-input")).toBeInTheDocument();

        expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();

        expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: /logout/i })).not.toBeInTheDocument();
    });

    // Khoo Jing Xiang, A0252605L
    it("should render categories fetched by real useCategory in the dropdown", async () => {
        // Arrange
        setupMockLocalStorage({
            cart: [],
        });

        const getCategoriesSpy = mockCategoryApi([
            { name: "Mice", slug: "mice" },
            { name: "Keyboards", slug: "keyboards" },
        ]);

        // Act
        renderWithProviders(<Header />);

        // Assert
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

        expect(getCategoriesSpy).toHaveBeenCalledWith(
            "/api/v1/category/get-category"
        );
    });

    // Khoo Jing Xiang, A0252605L
    it("should show correct cart badge count from the real cart context", async () => {
        // Arrange
        setupMockLocalStorage({
            cart: [{ id: 1 }, { id: 2 }, { id: 3 }],
        });
        mockCategoryApi([]);

        // Act
        renderWithProviders(<Header />);

        // Assert
        await waitFor(() => {
            expect(screen.getByTestId("badge")).toHaveAttribute("data-count", "3");
        });

        expect(screen.getByRole("link", { name: /cart/i })).toBeInTheDocument();
    });

    // Khoo Jing Xiang, A0252605L
    it("should render authenticated user dropdown with user dashboard route when role is 0", async () => {
        // Arrange
        setupMockLocalStorage({
            auth: {
                user: { name: "John", role: 0 },
                token: "abc123",
            },
            cart: [{ id: 1 }],
        });
        mockCategoryApi([]);

        // Act
        renderWithProviders(<Header />);

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
    it("should render authenticated user dropdown with admin dashboard route when role is 1", async () => {
        // Arrange
        setupMockLocalStorage({
            auth: {
                user: { name: "Admin", role: 1 },
                token: "secure-token",
            },
            cart: [],
        });
        mockCategoryApi([]);

        // Act
        renderWithProviders(<Header />);

        // Assert
        expect(await screen.findByText("Admin")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
            "href",
            "/dashboard/admin"
        );
        expect(screen.getByRole("link", { name: /logout/i })).toBeInTheDocument();

        expect(
            screen.queryByRole("link", { name: /register/i })
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("link", { name: /login/i })
        ).not.toBeInTheDocument();
    });

    // Khoo Jing Xiang, A0252605L
    it("should logout correctly by clearing auth, removing localStorage auth, and showing success toast", async () => {
        // Arrange
        setupMockLocalStorage({
            auth: {
                user: { name: "Admin", role: 1 },
                token: "secure-token",
            },
            cart: [],
        });
        mockCategoryApi([]);

        renderWithProviders(<Header />);

        expect(await screen.findByText("Admin")).toBeInTheDocument();

        // Act
        fireEvent.click(screen.getByRole("link", { name: /logout/i }));

        // Assert
        expect(window.localStorage.removeItem).toHaveBeenCalledWith("auth");
        expect(toast.success).toHaveBeenCalledWith("Logout Successfully");

        await waitFor(() => {
            expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
            expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();
        });

        expect(screen.queryByText("Admin")).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: /dashboard/i })).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: /logout/i })).not.toBeInTheDocument();
    });
});
