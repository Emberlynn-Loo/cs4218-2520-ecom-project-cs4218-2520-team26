import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import CategoryProduct from "./CategoryProduct";
import { useParams, useNavigate } from "react-router-dom";

//Emberlynn Loo, A0255614E

jest.mock("axios");

jest.mock("../components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div>{children}</div>,
}));

jest.mock("../styles/CategoryProductStyles.css", () => { });

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    useParams: jest.fn(),
    useNavigate: () => mockNavigate,
}));

const mockProducts = [
    {
        _id: "p1",
        name: "Product 1",
        description: "Test Description",
        price: 999,
        slug: "product1",
    },
    {
        _id: "p2",
        name: "Product 2",
        description: "Different Test Description",
        price: 111,
        slug: "product2",
    },
];

const mockCategory = { _id: "c1", name: "Cat 1" };

describe("CategoryProduct", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useParams.mockReturnValue({ slug: "cat1" });

        axios.get.mockResolvedValue({
            data: { products: mockProducts, category: mockCategory },
        });
    });

    it("renders category names and total products", async () => {
        //Act
        render(<CategoryProduct />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("Category - Cat 1")).toBeInTheDocument();
            expect(screen.getByText("2 result found")).toBeInTheDocument();
        });
    });

    it("calls API with correct slug", async () => {
        //Act
        render(<CategoryProduct />);

        //Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(
                "/api/v1/product/product-category/cat1"
            );
        });
    });

    it("does not call API if slug is missing", async () => {
        //Arrange
        useParams.mockReturnValue({});

        //Act
        render(<CategoryProduct />);

        //Assert
        await waitFor(() => expect(axios.get).not.toHaveBeenCalled());
    });

    it("displays product names and prices correctly", async () => {
        //Act
        render(<CategoryProduct />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("Product 1")).toBeInTheDocument();
            expect(screen.getByText("Product 2")).toBeInTheDocument();
            expect(screen.getByText("$999.00")).toBeInTheDocument();
            expect(screen.getByText("$111.00")).toBeInTheDocument();
        });
    });

    it("renders product images with correct src and alt", async () => {
        //Act
        render(<CategoryProduct />);

        //Assert
        await waitFor(() => screen.getByText("Product 1"));
        const images = screen.getAllByRole("img");

        expect(images[0]).toHaveAttribute(
            "src",
            "/api/v1/product/product-photo/p1"
        );
        expect(images[0]).toHaveAttribute("alt", "Product 1");
    });

    it("navigates to product detail page when more details is clicked", async () => {
        //Act
        render(<CategoryProduct />);
        await waitFor(() => screen.getByText("Product 1"));

        const buttons = screen.getAllByText("More Details");

        fireEvent.click(buttons[0]);

        //Assert
        expect(mockNavigate).toHaveBeenCalledWith("/product/product1");
    });

    it("logs error when fetch products fails", async () => {
        //Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.get.mockRejectedValueOnce(new Error("fetch failed"));

        //Act
        render(<CategoryProduct />);

        //Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });

        consoleSpy.mockRestore();
    });

    it("shows 0 result found when no products", async () => {
        //Arrange
        axios.get.mockResolvedValueOnce({
            data: { products: [], category: mockCategory },
        });

        //Act
        render(<CategoryProduct />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("0 result found")).toBeInTheDocument();
        });
    });
});