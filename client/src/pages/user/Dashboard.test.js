import React from "react";
import { render, screen } from "@testing-library/react";
import Dashboard from "./Dashboard";
import { useAuth } from "../../context/auth";

//Emberlynn Loo, A0255614E

jest.mock("../../context/auth", () => ({
    useAuth: jest.fn(),
}));

jest.mock("../../components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div>{children}</div>,
}));

jest.mock("../../components/UserMenu", () => ({
    __esModule: true,
    default: () => <div>UserMenu</div>,
}));

describe("Dashboard", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("renders user name, email and address", () => {
        //Arrange
        useAuth.mockReturnValue([{
            user: {
                name: "John Doe",
                email: "john@gmail.com",
                address: "123 Test Street",
            },
        }]);

        //Act
        render(<Dashboard />);

        //Assert
        expect(screen.getByText("John Doe")).toBeInTheDocument();
        expect(screen.getByText("john@gmail.com")).toBeInTheDocument();
        expect(screen.getByText("123 Test Street")).toBeInTheDocument();
    });
});