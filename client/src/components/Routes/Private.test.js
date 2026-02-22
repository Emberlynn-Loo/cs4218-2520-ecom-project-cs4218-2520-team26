import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import PrivateRoute from "./Private";
import { useAuth } from "../../context/auth";

//Emberlynn Loo, A0255614E

jest.mock("axios");

jest.mock("../../context/auth", () => ({
    useAuth: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
    Outlet: () => <div>Protected Content</div>,
}));

jest.mock("../Spinner", () => ({
    __esModule: true,
    default: ({ path }) => <div>Loading Spinner</div>,
}));

describe("Private", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("shows Outlet if auth check passes", async () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        axios.get.mockResolvedValueOnce({ data: { ok: true } });

        //Act
        render(<PrivateRoute />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("Protected Content")).toBeInTheDocument();
        });
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });

    it("shows Spinner if auth check fails", async () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        axios.get.mockResolvedValueOnce({ data: { ok: false } });

        //Act
        render(<PrivateRoute />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("Loading Spinner")).toBeInTheDocument();
        });
    });

    it("shows Spinner initially before auth check completes", () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        axios.get.mockResolvedValueOnce({ data: { ok: true } });

        //Act
        render(<PrivateRoute />);

        //Assert
        expect(screen.getByText("Loading Spinner")).toBeInTheDocument();
    });

    it("does not call auth check when no token", async () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "" }, jest.fn()]);

        //Act
        render(<PrivateRoute />);

        //Assert
        await waitFor(() => expect(screen.getByText("Loading Spinner")).toBeInTheDocument());
        expect(axios.get).not.toHaveBeenCalled();
    });

    it("does not call auth check when auth is null", async () => {
        //Arrange
        useAuth.mockReturnValue([null, jest.fn()]);

        //Act
        render(<PrivateRoute />);

        //Assert
        expect(axios.get).not.toHaveBeenCalled();
        expect(screen.getByText("Loading Spinner")).toBeInTheDocument();
    });

    it("shows Spinner when auth check throws error", async () => {
        //Arrange
        useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);

        axios.get.mockRejectedValueOnce(new Error("network error"));

        //Act
        render(<PrivateRoute />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("Loading Spinner")).toBeInTheDocument();
        });
    });
});