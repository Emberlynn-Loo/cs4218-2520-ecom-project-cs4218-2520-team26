// Ashley Chang Le Xuan, A0252633J
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import toast from "react-hot-toast";

import Profile from "../../pages/user/Profile";
import { AuthProvider, useAuth } from "../../context/auth";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

jest.mock("../../components/UserMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="user-menu">User Menu</div>,
}));

const AuthStateConsumer = () => {
  const [auth] = useAuth();
  return (
    <div>
      <div data-testid="auth-user-name">{auth?.user?.name || ""}</div>
      <div data-testid="auth-user-email">{auth?.user?.email || ""}</div>
    </div>
  );
};

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
  });
};

const setAuthInStorage = (authData) => {
  window.localStorage.setItem("auth", JSON.stringify(authData));
};

const renderProfileWithAuthProvider = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <AuthStateConsumer />
        <Profile />
      </AuthProvider>
    </MemoryRouter>
  );

describe("Profile integration with real AuthProvider and mocked axios boundary", () => {
  const initialAuth = {
    user: {
      _id: "u1",
      name: "John Doe",
      email: "john@test.com",
      phone: "1234567890",
      address: "123 Main St",
    },
    token: "test-token",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupLocalStorage();
    axios.defaults = { headers: { common: {} } };
    setAuthInStorage(initialAuth);
  });

  it("reads user data from real AuthProvider and pre-populates form fields", async () => {
    // Arrange
    renderProfileWithAuthProvider();

    // Act + Assert
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue("John Doe");
      expect(screen.getByPlaceholderText("Enter Your Phone")).toHaveValue("1234567890");
      expect(screen.getByPlaceholderText("Enter Your Address")).toHaveValue("123 Main St");
      expect(screen.getByPlaceholderText("Enter Your Email")).toHaveValue("john@test.com");
    });
  });

  it("keeps email input disabled and unchanged by user typing", async () => {
    // Arrange
    const user = userEvent;
    renderProfileWithAuthProvider();

    const emailInput = await screen.findByPlaceholderText("Enter Your Email");

    // Act
    user.type(emailInput, "changed@test.com");

    // Assert
    expect(emailInput).toBeDisabled();
    expect(emailInput).toHaveValue("john@test.com");
  });

  describe("EP - API outcome partitions", () => {
    it("EP: success response updates auth context and localStorage, and sends correct axios payload", async () => {
      // Arrange
      const user = userEvent;
      const updatedUser = {
        ...initialAuth.user,
        name: "Jane Doe",
        phone: "9999999999",
        address: "456 New St",
      };
      axios.put.mockResolvedValueOnce({
        data: {
          updatedUser,
        },
      });

      renderProfileWithAuthProvider();

      await waitFor(() =>
        expect(screen.getByTestId("auth-user-name").textContent).toBe("John Doe")
      );

      // Act
      user.clear(screen.getByPlaceholderText("Enter Your Name"));
      user.type(screen.getByPlaceholderText("Enter Your Name"), "Jane Doe");

      user.clear(screen.getByPlaceholderText("Enter Your Phone"));
      user.type(screen.getByPlaceholderText("Enter Your Phone"), "9999999999");

      user.clear(screen.getByPlaceholderText("Enter Your Address"));
      user.type(screen.getByPlaceholderText("Enter Your Address"), "456 New St");

      user.type(screen.getByPlaceholderText("Enter Your Password"), "newPassword456");
      user.click(screen.getByRole("button", { name: "UPDATE" }));

      // Assert
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", {
          name: "Jane Doe",
          email: "john@test.com",
          password: "newPassword456",
          phone: "9999999999",
          address: "456 New St",
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("auth-user-name").textContent).toBe("Jane Doe");
        expect(screen.getByTestId("auth-user-email").textContent).toBe("john@test.com");
      });

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "auth",
        JSON.stringify({
          ...initialAuth,
          user: updatedUser,
        })
      );
      expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully");
    });

    it("EP: API logical error shows toast.error and keeps auth context unchanged", async () => {
      // Arrange
      const user = userEvent;
      axios.put.mockResolvedValueOnce({
        data: {
          error: "Password is required to be at least 6 characters long",
        },
      });

      renderProfileWithAuthProvider();

      await waitFor(() =>
        expect(screen.getByTestId("auth-user-name").textContent).toBe("John Doe")
      );

      // Act
      user.type(screen.getByPlaceholderText("Enter Your Password"), "12345");
      user.click(screen.getByRole("button", { name: "UPDATE" }));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Password is required to be at least 6 characters long"
        );
      });

      expect(screen.getByTestId("auth-user-name").textContent).toBe("John Doe");
      expect(screen.getByTestId("auth-user-email").textContent).toBe("john@test.com");
      expect(window.localStorage.setItem).not.toHaveBeenCalledWith(
        "auth",
        expect.stringContaining("Jane Doe")
      );
    });

    it("EP: API rejection shows toast.error and keeps auth context unchanged", async () => {
      // Arrange
      const user = userEvent;
      axios.put.mockRejectedValueOnce(new Error("Network error"));
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

      renderProfileWithAuthProvider();

      await waitFor(() =>
        expect(screen.getByTestId("auth-user-name").textContent).toBe("John Doe")
      );

      // Act
      user.click(screen.getByRole("button", { name: "UPDATE" }));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });

      expect(screen.getByTestId("auth-user-name").textContent).toBe("John Doe");
      expect(screen.getByTestId("auth-user-email").textContent).toBe("john@test.com");
      consoleSpy.mockRestore();
    });
  });

  it("submits current values even when password is left empty", async () => {
    // Arrange
    const user = userEvent;
    axios.put.mockResolvedValueOnce({
      data: {
        updatedUser: {
          ...initialAuth.user,
          name: "No Password Change",
        },
      },
    });

    renderProfileWithAuthProvider();

    // Act
    user.clear(screen.getByPlaceholderText("Enter Your Name"));
    user.type(screen.getByPlaceholderText("Enter Your Name"), "No Password Change");
    user.click(screen.getByRole("button", { name: "UPDATE" }));

    // Assert
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/profile",
        expect.objectContaining({
          password: "",
          name: "No Password Change",
          email: "john@test.com",
        })
      );
    });
  });
});
