import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import Header from "./Header";

jest.mock("../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../context/cart", () => ({
  useCart: jest.fn(),
}));

jest.mock("../hooks/useCategory", () => jest.fn());

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
  },
}));

jest.mock("./Form/SearchInput", () => () => (
  <div data-testid="search-input">SearchInput</div>
));

jest.mock("antd", () => ({
  Badge: ({ count, children }) => (
    <div data-testid="badge" data-count={count}>
      {children}
    </div>
  ),
}));

import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";
import useCategory from "../hooks/useCategory";
import toast from "react-hot-toast";

// Khoo Jing Xiang, A0252605L

describe("Header", () => {
  const setAuthMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    Object.defineProperty(window, "localStorage", {
      value: { removeItem: jest.fn() },
      writable: true,
    });

    useCart.mockReturnValue([[]]);
    useCategory.mockReturnValue([
      { name: "Mice", slug: "mice" },
      { name: "Keyboards", slug: "keyboards" },
    ]);
  });

  it("should render Register/Login when not authenticated", () => {
    // Arrange
    useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);

    // Act
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Assert
    expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument();
    expect(screen.getByTestId("search-input")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /register/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /login/i })).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /^categories$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /all categories/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /mice/i })).toHaveAttribute(
      "href",
      "/category/mice"
    );
    expect(screen.getByRole("link", { name: /keyboards/i })).toHaveAttribute(
      "href",
      "/category/keyboards"
    );
  });

  it("should render user dropdown when authenticated", () => {
    // Arrange
    useAuth.mockReturnValue([
      { user: { name: "John", role: 0 }, token: "t" },
      setAuthMock,
    ]);

    // Act
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Assert
    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard/user"
    );
    expect(screen.getByRole("link", { name: /logout/i })).toBeInTheDocument();
  });

  it("should clear auth on logout, removes localStorage auth, shows toast, navigates to /login link", () => {
    // Arrange
    const authState = { user: { name: "John", role: 1 }, token: "abc" };
    useAuth.mockReturnValue([authState, setAuthMock]);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Act
    fireEvent.click(screen.getByRole("link", { name: /logout/i }));

    // Assert
    expect(setAuthMock).toHaveBeenCalledWith({
      ...authState,
      user: null,
      token: "",
    });
    expect(window.localStorage.removeItem).toHaveBeenCalledWith("auth");
    expect(toast.success).toHaveBeenCalledWith("Logout Successfully");
  });

  it("should show cart badge count", () => {
    // Arrange
    useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);
    useCart.mockReturnValue([[{ id: 1 }, { id: 2 }, { id: 3 }]]);

    // Act
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Assert
    const badge = screen.getByTestId("badge");
    expect(badge).toHaveAttribute("data-count", "3");
    expect(screen.getByRole("link", { name: /cart/i })).toBeInTheDocument();
  });
});
