import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import Products from "./Products";

//Emberlynn Loo, A0255614E

jest.mock("axios");

jest.mock("react-hot-toast");

jest.mock("../../components/AdminMenu", () => ({
    __esModule: true,
    default: () => <div>AdminMenu</div>,
}));

jest.mock("./../../components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div>{children}</div>,
}));

jest.mock("react-router-dom", () => ({
    Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

const mockProducts = [
    {
        _id: "p1",
        name: "Product 1",
        description: "Test Description",
        slug: "product1",
    },
    {
        _id: "p2",
        name: "Product 2",
        description: "Diff Test Description",
        slug: "product2",
    },
];

describe("Products", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        axios.get.mockResolvedValue({ data: { products: mockProducts } });
    });

    it("renders page heading", () => {
        //Arrange + Act
        render(<Products />);

        //Assert
        expect(screen.getByText("All Products List")).toBeInTheDocument();
        expect(screen.getByText("AdminMenu")).toBeInTheDocument();
    });

    it("fetches and displays all products on initial load", async () => {
        //Arrange + Act
        render(<Products />);

        //Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
        });

        await waitFor(() => {
            expect(screen.getByText("Product 1")).toBeInTheDocument();
            expect(screen.getByText("Product 2")).toBeInTheDocument();
        });
    });

    it("renders product links with correct href", async () => {
        //Arrange + Act
        render(<Products />);

        await waitFor(() => screen.getByText("Product 1"));

        //Assert
        const links = screen.getAllByRole("link");
        expect(links[0]).toHaveAttribute("href", "/dashboard/admin/product/product1");
        expect(links[1]).toHaveAttribute("href", "/dashboard/admin/product/product2");
    });

    it("renders product images with correct src", async () => {
        //Arrange + Act
        render(<Products />);

        await waitFor(() => screen.getByText("Product 1"));

        //Assert
        const images = screen.getAllByRole("img");
        expect(images[0]).toHaveAttribute("src", "/api/v1/product/product-photo/p1");
        expect(images[0]).toHaveAttribute("alt", "Product 1");
    });

    it("shows error toast when fetch fails", async () => {
        //Arrange
        axios.get.mockRejectedValueOnce(new Error("Network error"));

        //Act
        render(<Products />);

        //Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something Went Wrong");
        });
    });

    it("renders empty list when no products", async () => {
        //Arrange
        axios.get.mockResolvedValueOnce({ data: { products: [] } });

        //Act
        render(<Products />);

        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        //Assert
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
});