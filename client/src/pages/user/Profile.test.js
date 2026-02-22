import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import Profile from "./Profile";
import { useAuth } from "../../context/auth";

jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("../../context/auth");
jest.mock("../../components/Layout", () => ({ children, title }) => (
    <div data-testid="layout" data-title={title}>{children}</div>
));
jest.mock("../../components/UserMenu", () => () => (
    <div data-testid="user-menu">User Menu</div>
));

Object.defineProperty(window, "localStorage", {
    value: { setItem: jest.fn(), getItem: jest.fn(), removeItem: jest.fn() },
    writable: true,
});

const mockUser = {
    name: "John Doe",
    email: "john@test.com",
    phone: "1234567890",
    address: "123 Main St",
};

const renderComponent = (user = mockUser) => {
    useAuth.mockReturnValue([{ token: "test-token", user }, jest.fn()]);
    return render(<Profile />);
};

// Ashley Chang Le Xuan, A0252633J
describe("Profile Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Layout Rendering", () => {
        it("should render Profile form heading", () => {
            // Arrange
            // (uses default mockUser)

            // Act
            renderComponent();

            // Assert
            expect(screen.getByText("USER PROFILE")).toBeInTheDocument();
        });

        it("should render UserMenu component", () => {
            // Arrange
            // (uses default mockUser)

            // Act
            renderComponent();

            // Assert
            expect(screen.getByTestId("user-menu")).toBeInTheDocument();
        });
    });

    describe("Form Rendering", () => {
        it("should pre-populate form fields with existing user data", () => {
            // Arrange
            // (uses default mockUser)

            // Act
            renderComponent();

            // Assert
            expect(screen.getByPlaceholderText("Enter Your Name").value).toBe("John Doe");
            expect(screen.getByDisplayValue("john@test.com")).toBeInTheDocument();
            expect(screen.getByPlaceholderText("Enter Your Phone").value).toBe("1234567890");
            expect(screen.getByPlaceholderText("Enter Your Address").value).toBe("123 Main St");
        });

        it("should render password field as empty initially", () => {
            // Arrange
            // (uses default mockUser)

            // Act
            renderComponent();

            // Assert
            expect(screen.getByPlaceholderText("Enter Your Password").value).toBe("");
        });

        it("should render email field as disabled", () => {
            // Arrange
            // (uses default mockUser)

            // Act
            renderComponent();

            // Assert
            const emailInput = screen.getByDisplayValue("john@test.com");
            expect(emailInput).toBeDisabled();
        });

        it("should render UPDATE button", () => {
            // Arrange
            // (uses default mockUser)

            // Act
            renderComponent();

            // Assert
            expect(screen.getByText("UPDATE")).toBeInTheDocument();
        });
    });

    describe("Form Interaction", () => {
        it("should allow updating name field", () => {
            // Arrange
            renderComponent();

            // Act
            fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
                target: { value: "Jane Doe" },
            });

            // Assert
            expect(screen.getByPlaceholderText("Enter Your Name").value).toBe("Jane Doe");
        });

        it("should allow updating phone field", () => {
            // Arrange
            renderComponent();

            // Act
            fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
                target: { value: "9999999999" },
            });

            // Assert
            expect(screen.getByPlaceholderText("Enter Your Phone").value).toBe("9999999999");
        });

        it("should allow updating address field", () => {
            // Arrange
            renderComponent();

            // Act
            fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
                target: { value: "456 New St" },
            });

            // Assert
            expect(screen.getByPlaceholderText("Enter Your Address").value).toBe("456 New St");
        });

        it("should allow typing in password field", () => {
            // Arrange
            renderComponent();

            // Act
            fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
                target: { value: "newpassword" },
            });

            // Assert
            expect(screen.getByPlaceholderText("Enter Your Password").value).toBe("newpassword");
        });
    });

    describe("Form Submission", () => {
        it("should update profile successfully (EP: Valid data)", async () => {
            // Arrange
            axios.put.mockResolvedValueOnce({
                data: { updatedUser: { ...mockUser, name: "Jane Doe" } },
            });
            window.localStorage.getItem.mockReturnValue(JSON.stringify({ user: mockUser }));
            renderComponent();

            // Act
            fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
                target: { value: "Jane Doe" },
            });
            fireEvent.click(screen.getByText("UPDATE"));

            // Assert
            await waitFor(() => {
                expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", expect.objectContaining({
                    name: "Jane Doe",
                    email: "john@test.com",
                    phone: "1234567890",
                    address: "123 Main St",
                }));
                expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully");
            });
        });

        it("should handle update failure gracefully (EP: API error)", async () => {
            // Arrange
            axios.put.mockRejectedValueOnce(new Error("Network error"));
            jest.spyOn(console, "log").mockImplementation(() => {});
            renderComponent();

            // Act
            fireEvent.click(screen.getByText("UPDATE"));

            // Assert
            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith("Something went wrong");
            });

            console.log.mockRestore();
        });

        it("should update password when valid password provided (BV: ≥6 chars)", async () => {
            // Arrange
            axios.put.mockResolvedValueOnce({
                data: { updatedUser: mockUser },
            });
            window.localStorage.getItem.mockReturnValue(JSON.stringify({ user: mockUser }));
            renderComponent();

            // Act
            fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
                target: { value: "validPass" },
            });
            fireEvent.click(screen.getByText("UPDATE"));

            // Assert
            await waitFor(() => {
                expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", expect.objectContaining({
                    password: "validPass",
                }));
            });
        });

        it("should update localStorage after successful profile update", async () => {
            // Arrange
            const updatedUser = { ...mockUser, name: "Jane Doe" };
            axios.put.mockResolvedValueOnce({ data: { updatedUser } });
            window.localStorage.getItem.mockReturnValue(JSON.stringify({ user: mockUser }));
            renderComponent();

            // Act
            fireEvent.click(screen.getByText("UPDATE"));

            // Assert
            await waitFor(() => {
                expect(window.localStorage.setItem).toHaveBeenCalledWith(
                    "auth",
                    JSON.stringify({ user: updatedUser })
                );
            });
        });
    });
});