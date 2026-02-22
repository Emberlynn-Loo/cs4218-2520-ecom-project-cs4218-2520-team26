import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Login from './Login';
import { clear } from 'console';
import { useAuth } from '../../context/auth';
import { message } from 'antd';

// Mocks
jest.mock('axios');

jest.mock('react-hot-toast', () => ({
    success: jest.fn(),
    error: jest.fn(),
}));

const mockNavigate = jest.fn();
let mockLocation = { state: null };

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
}));

jest.mock("../../components/Layout", () => ({ children }) => <div>{children}</div>);

const mockSetAuth = jest.fn();
jest.mock('../../context/auth', () => ({
    useAuth: jest.fn(() => [null, mockSetAuth]) // Mock useAuth hook to return null state and a mock function for setAuth
  }));

  jest.mock('../../context/cart', () => ({
    useCart: jest.fn(() => [null, jest.fn()]) // Mock useCart hook to return null state and a mock function
  }));
    
jest.mock('../../context/search', () => ({
    useSearch: jest.fn(() => [{ keyword: '' }, jest.fn()]) // Mock useSearch hook to return null state and a mock function
  }));  

  Object.defineProperty(window, 'localStorage', {
    value: {
      setItem: jest.fn(),
      getItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });

window.matchMedia = window.matchMedia || function() {
    return {
      matches: false,
      addListener: function() {},
      removeListener: function() {}
    };
  };  

// Constants
const loginFormFields = {
    title: 'LOGIN FORM',
    email: 'Enter Your Email',
    password: 'Enter Your Password',
    loginButton: 'LOGIN',
    forgetPasswordButton: 'Forgot Password',
};

const mockUser = { 
    _id: "123456789",
    name: "John Doe",
    email: "test@example.com",
    phone: "1234567890",
    address: "123 Main Street",
    answer: "Singapore",
    role: 0
}
const mockToken = "mock-token";

// Helper functions
function fillLoginForm() {
    fireEvent.change(screen.getByPlaceholderText(loginFormFields.email), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByPlaceholderText(loginFormFields.password), { target: { value: "password123" } });
}

// Nicholas Koh Zi Lun (A0272806B) - Unit tests for Login.js
describe('Login Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocation = { state: null };
        axios.get.mockResolvedValue({ data: { category: [] } });
    });

    it('renders login form fields', () => {
        // Arrange
        render(<Login />);

        // Assert
        expect(screen.getByText(loginFormFields.title)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(loginFormFields.email)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(loginFormFields.password)).toBeInTheDocument();
        expect(screen.getByText(loginFormFields.forgetPasswordButton)).toBeInTheDocument();
    });

    it("allows typing in email and password fields", () => {
        // Arrange
        render(<Login />);
        fillLoginForm();

        // Assert
        expect(screen.getByPlaceholderText(loginFormFields.email).value).toBe("test@example.com");
        expect(screen.getByPlaceholderText(loginFormFields.password).value).toBe("password123");
      });

    it('inputs should be initially empty', async () => {
        // Arrange
        render(<Login />);

        // Assert
        expect(screen.getByPlaceholderText(loginFormFields.email).value).toBe('');
        expect(screen.getByPlaceholderText(loginFormFields.password).value).toBe('');
    });

    it("submits correct payload to axios.post on form submission", async () => {
        // Arrange
        axios.post.mockResolvedValueOnce({
            data: {
                success: true,
                user: mockUser,
                token: mockToken
            }
        });
        render(<Login />);
        fillLoginForm();

        // Act
        fireEvent.click(screen.getByText(loginFormFields.loginButton));

        // Assert
        await waitFor(() => expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
            email: "test@example.com",
            password: "password123"
        }));
    });

    it("handles successful login correctly", async () => {
        // Arrange
        const initialAuth = { user: null, token: "" };
        useAuth.mockReturnValue([initialAuth, mockSetAuth]);
        const responseData = {
            success: true,
            message: "Login successfully",
            user: mockUser,
            token: mockToken
        };
        axios.post.mockResolvedValueOnce({ data: responseData });
        render(<Login />);
        fillLoginForm();

        // Act
        fireEvent.click(screen.getByText(loginFormFields.loginButton));

        // Assert
        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith(responseData.message, {
                duration: 5000,
                icon: "🙏",
                style: { background: "green", color: "white" }
            });
            expect(mockSetAuth).toHaveBeenCalledWith({
                ...initialAuth,
                user: responseData.user,
                token: responseData.token
            });
            expect(localStorage.setItem).toHaveBeenCalledWith("auth", JSON.stringify({
                success: responseData.success,
                message: responseData.message,
                user: responseData.user,
                token: responseData.token
            }));
            expect(mockNavigate).toHaveBeenCalledWith("/");
        });
    });

    it("navigates to location.state after successful login", async () => {
        // Arrange
        mockLocation = { state: "/checkout" };
        axios.post.mockResolvedValueOnce({
            data: {
                success: true,
                message: "Login successfully",
                user: mockUser,
                token: mockToken
            }
        });
        render(<Login />);
        fillLoginForm();

        // Act
        fireEvent.click(screen.getByText(loginFormFields.loginButton));

        // Assert
        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith("/checkout");
        });
    });

    it('should display error message on failed login', async () => {
        // Arrange
        axios.post.mockResolvedValueOnce({
          data: { success: false, message: "Invalid credentials" },
        });
        render(<Login />);
        fillLoginForm();

        // Act
        fireEvent.click(screen.getByText(loginFormFields.loginButton));

        // Assert
        await waitFor(() => expect(axios.post).toHaveBeenCalled());
        expect(toast.error).toHaveBeenCalledWith('Invalid credentials');
    });

    it("should display generic error message when login fails with server error", async () => {
        // Arrange
        axios.post.mockRejectedValueOnce(new Error('Server error'));
        render(<Login />);
        fillLoginForm();
        jest.spyOn(console, "log").mockImplementation(() => {});

        // Act
        fireEvent.click(screen.getByText(loginFormFields.loginButton));

        // Assert
        await waitFor(() => expect(axios.post).toHaveBeenCalled());
        expect(toast.error).toHaveBeenCalledWith('Something went wrong');
        console.log.mockRestore();
    });

    it("navigates to forgot password page when 'Forgot Password' button is clicked", () => {
        // Arrange
        render(<Login />);

        // Act
        fireEvent.click(screen.getByText(loginFormFields.forgetPasswordButton));

        // Assert
        expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
    });
});
