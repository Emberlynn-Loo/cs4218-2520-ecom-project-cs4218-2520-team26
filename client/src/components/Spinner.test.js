import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import Spinner from "./Spinner";

// mock react-router hooks
const mockNavigate = jest.fn();
const mockUseLocation = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockUseLocation(),
  };
});

// Khoo Jing Xiang, A0252605L

describe("Spinner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseLocation.mockReturnValue({ pathname: "/protected" });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should render countdown text and spinner", () => {
    // Arrange
    render(<Spinner />);

    // Act
    const countdown = screen.getByText(/redirecting to you in/i);
    const spinner = screen.getByRole("status");
    const initialCount = screen.getByText(/3 second/i);

    // Assert
    expect(countdown).toBeInTheDocument();
    expect(spinner).toBeInTheDocument();
    expect(initialCount).toBeInTheDocument();
  });

  it("should count down and navigate to /login by default when it reaches 0", () => {
    // Arrange
    render(<Spinner />);

    // Act + Assert (stepwise)
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/2 second/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/1 second/i)).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Assert (navigation)
    expect(mockNavigate).toHaveBeenCalledWith("/login", {
      state: "/protected",
    });
  });

  it("should navigate to custom path when path prop is provided", () => {
    // Arrange
    render(<Spinner path="register" />);

    // Act
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith("/register", {
      state: "/protected",
    });
  });
});
