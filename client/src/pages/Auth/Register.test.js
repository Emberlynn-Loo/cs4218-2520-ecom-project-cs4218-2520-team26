import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';
import toast from 'react-hot-toast';
import Register from './Register';

/**
 * Created by: Nicholas Koh Zi Lun (A0272806B)
 */

// Mocks
jest.mock('axios');

jest.mock('react-hot-toast', () => ({
    success: jest.fn(),
    error: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

jest.mock("../../components/Layout", () => ({ children }) => <div>{children}</div>);


jest.mock('../../context/auth', () => ({
    useAuth: jest.fn(() => [null, jest.fn()]) // Mock useAuth hook to return null state and a mock function for setAuth
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
const formFields = {
    title: "REGISTER FORM",
    name: "Enter Your Name",
    email: "Enter Your Email",
    password: "Enter Your Password",
    phone: "Enter Your Phone",
    address: "Enter Your Address",
    dob: "Enter Your DOB",
    answer: "What is Your Favorite sports",
    button: "REGISTER",
};

const mockUser = {
    name: "John Doe",
    email: "test@example.com",
    password: "password123",
    phone: "1234567890",
    address: "123 Street",
    dob: "2000-01-01",
    answer: "Football"
};

// Helper Functions
function renderRegister() {
    return render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );
}

function fillValidFormWithMockData() {
    fireEvent.change(screen.getByPlaceholderText(formFields.name), {
      target: { value: mockUser.name },
    });
    fireEvent.change(screen.getByPlaceholderText(formFields.email), {
      target: { value: mockUser.email },
    });
    fireEvent.change(screen.getByPlaceholderText(formFields.password), {
      target: { value: mockUser.password },
    });
    fireEvent.change(screen.getByPlaceholderText(formFields.phone), {
      target: { value: mockUser.phone },
    });
    fireEvent.change(screen.getByPlaceholderText(formFields.address), {
      target: { value: mockUser.address },
    });
    fireEvent.change(screen.getByPlaceholderText(formFields.dob), {
      target: { value: mockUser.dob },
    });
    fireEvent.change(screen.getByPlaceholderText(formFields.answer), {
      target: { value: mockUser.answer },
    });
}
      

// Tests
describe('Register Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders register form fields", () => {
    // Arrange
    const { getByText, getByPlaceholderText } = renderRegister();

    // Assert
    expect(getByText(formFields.title)).toBeInTheDocument();
    expect(getByPlaceholderText(formFields.name)).toBeInTheDocument();
    expect(getByPlaceholderText(formFields.email)).toBeInTheDocument();
    expect(getByPlaceholderText(formFields.password)).toBeInTheDocument();
    expect(getByPlaceholderText(formFields.phone)).toBeInTheDocument();
    expect(getByPlaceholderText(formFields.address)).toBeInTheDocument();
    expect(getByPlaceholderText(formFields.dob)).toBeInTheDocument();
    expect(getByPlaceholderText(formFields.answer)).toBeInTheDocument();
    expect(getByText(formFields.button)).toBeInTheDocument();
  });

  it("submits correct payload to axios.post on form submission", async () => {
    // Arrange
    axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    const { getByText, getByPlaceholderText } = renderRegister();
    fillValidFormWithMockData();

    // Act
    fireEvent.click(getByText(formFields.button));

    // Assert
    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(1));
    expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
      name: mockUser.name,
      email: mockUser.email,
      password: mockUser.password,
      phone: mockUser.phone,
      address: mockUser.address,
      DOB: mockUser.dob,
      answer: mockUser.answer
    });
  });

  it('should register the user successfully', async () => {
    // Arrange
    axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    const { getByText, getByPlaceholderText } = renderRegister();
    fillValidFormWithMockData();

    // Act
    fireEvent.click(getByText(formFields.button));

    // Assert
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith('Register Successfully, please login');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should display error message on failed registration', async () => {
    // Arrange
    axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
    axios.post.mockResolvedValueOnce({ data: { success: false, message: 'User already exists' } });
    const { getByText, getByPlaceholderText } = renderRegister();
    fillValidFormWithMockData();

    // Act
    fireEvent.click(getByText(formFields.button));

    // Assert
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('User already exists');
  });

  it('should display error message when registration fails with server error', async () => {
    // Arrange
    axios.get.mockResolvedValueOnce({ data: { category: [] } }); 
    axios.post.mockRejectedValueOnce(new Error('Server error'));
    const { getByText, getByPlaceholderText } = renderRegister();
    fillValidFormWithMockData();

    // Act
    fireEvent.click(getByText(formFields.button));

    // Assert
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('Something went wrong');
  });
});
