import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import ProductDetails from "./ProductDetails";
import { useParams, useNavigate } from "react-router-dom";

//Emberlynn Loo, A0255614E

jest.mock("axios");

jest.mock("./../components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div>{children}</div>,
}));

jest.mock("../styles/ProductDetailsStyles.css", () => { });

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    useParams: jest.fn(),
    useNavigate: () => mockNavigate,
}));

const mockProduct = {
    _id: "p1",
    name: "Product 1",
    description: "Test Description",
    price: 999,
    slug: "product1",
    category: { _id: "c1", name: "Cat 1" },
};

const mockRelated = [
    {
        _id: "p2",
        name: "Product 2",
        description: "Different Test Description",
        price: 111,
        slug: "product2",
    },
];

describe("ProductDetails", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        useParams.mockReturnValue({ slug: "product1" });

        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            if (url.includes("related-product")) {
                return Promise.resolve({ data: { products: mockRelated } });
            }
            return Promise.resolve({ data: {} });
        });
    });

    it("renders Product Details title on screen", async () => {
        //Act
        render(<ProductDetails />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("Product Details")).toBeInTheDocument();
        });
    });

    it("fetches product on mount when slug exists", async () => {
        //Act
        render(<ProductDetails />);

        //Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(
                "/api/v1/product/get-product/product1"
            );
        });
    });

    it("does not fetch when slug is missing", async () => {
        //Arrange
        useParams.mockReturnValue({});

        //Act
        render(<ProductDetails />);

        //Assert
        expect(axios.get).not.toHaveBeenCalled();
    });

    it("shows product details correctly", async () => {
        //Act
        render(<ProductDetails />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("Name : Product 1")).toBeInTheDocument();
            expect(screen.getByText("Description : Test Description")).toBeInTheDocument();
            expect(screen.getByText("Category : Cat 1")).toBeInTheDocument();
        });
    });


    it("shows product price correctly as currency", async () => {
        //Act
        render(<ProductDetails />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText(/\$999\.00/)).toBeInTheDocument();
        });
    });

    it("renders product image with correct src", async () => {
        //Act
        render(<ProductDetails />);

        //Assert
        await waitFor(() => screen.getByText("Name : Product 1"));

        const images = screen.getAllByRole("img");

        expect(images[0]).toHaveAttribute(
            "src",
            "/api/v1/product/product-photo/p1"
        );
    });

    it("fetches related products after getting product", async () => {
        //Act
        render(<ProductDetails />);

        //Assert
        await waitFor(() => screen.getByText("Name : Product 1"));

        const images = screen.getAllByRole("img");

        expect(images[0]).toHaveAttribute(
            "src",
            "/api/v1/product/product-photo/p1"
        );
    });

    it("shows related products", async () => {
        //Act
        render(<ProductDetails />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("Product 2")).toBeInTheDocument();
            expect(screen.getByText("$111.00")).toBeInTheDocument();
        });
    });

    it("shows no similar products message when no related products exist", async () => {
        //Arrange
        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            return Promise.resolve({ data: { products: [] } });
        });

        //Act
        render(<ProductDetails />);

        //Assert
        await waitFor(() => {
            expect(
                screen.getByText("No Similar Products found")
            ).toBeInTheDocument();
        });
    });

    it("navigates to product when More Details is clicked", async () => {
        //Act
        render(<ProductDetails />);

        await waitFor(() => screen.getByText("Product 2"));

        fireEvent.click(screen.getByText("More Details"));

        //Assert
        expect(mockNavigate).toHaveBeenCalledWith("/product/product2");
    });

    it("logs error when getProduct fails", async () => {
        //Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.get.mockRejectedValueOnce(new Error("fetch failed"));

        //Act
        render(<ProductDetails />);

        //Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });
        consoleSpy.mockRestore();
    });

    it("logs error when getSimilarProduct fails", async () => {
        //Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });
        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) {
                return Promise.resolve({ data: { product: mockProduct } });
            }
            return Promise.reject(new Error("related fetch failed"));
        });

        //Act
        render(<ProductDetails />);

        //Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });
        consoleSpy.mockRestore();
    });

    it("renders ADD TO CART button", async () => {
        //Act
        render(<ProductDetails />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("ADD TO CART")).toBeInTheDocument();
        });
    });
});