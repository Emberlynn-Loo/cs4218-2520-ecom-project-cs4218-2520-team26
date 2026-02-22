import React from "react";
import { render, screen } from "@testing-library/react";
import Search from "./Search";
const { useSearch } = require("../context/search");

jest.mock("../components/Layout", () => {
    return function MockLayout({ children, title }) {
        return <div data-testid="layout">{children}</div>;
    };
});

jest.mock("../context/search", () => ({
    useSearch: jest.fn(),
}));

// Ashley Chang Le Xuan, A0252633J
describe("Search Component", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should render Search Results heading", () => {
        // Arrange
        useSearch.mockReturnValue([{ results: [] }, jest.fn()]);

        // Act
        render(<Search />);

        // Assert
        expect(screen.getByText("Search Results")).toBeInTheDocument();
    });

    describe("Search Results Count", () => {
        it("should display 'No Products Found' when results array is empty (BV: 0)", () => {
            // Arrange
            useSearch.mockReturnValue([{ results: [] }, jest.fn()]);

            // Act
            render(<Search />);

            // Assert
            expect(screen.getByText("No Products Found")).toBeInTheDocument();
        });

        it("should display product count when results has 1 product (BV: 1)", () => {
            // Arrange
            const mockResults = [
                { _id: "1", name: "Product 1", description: "Description 1", price: 100 },
            ];
            useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

            // Act
            render(<Search />);

            // Assert
            expect(screen.getByText("Found 1")).toBeInTheDocument();
        });

        it("should display product count when results has more than 1 product (BV: 2)", () => {
            // Arrange
            const mockResults = [
                { _id: "1", name: "Product 1", description: "Description 1", price: 100 },
                { _id: "2", name: "Product 2", description: "Description 2", price: 200 },
            ];
            useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

            // Act
            render(<Search />);

            // Assert
            expect(screen.getByText("Found 2")).toBeInTheDocument();
        });
    });

    it("should render multiple product cards", () => {
        // Arrange
        const mockResults = [
            { _id: "1", name: "Product 1", description: "Desc 1", price: 100 },
            { _id: "2", name: "Product 2", description: "Desc 2", price: 200 },
            { _id: "3", name: "Product 3", description: "Desc 3", price: 300 },
        ];
        useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

        // Act
        render(<Search />);

        // Assert
        expect(screen.getByText("Found 3")).toBeInTheDocument();
        expect(screen.getByText("Product 1")).toBeInTheDocument();
        expect(screen.getByText("Product 2")).toBeInTheDocument();
        expect(screen.getByText("Product 3")).toBeInTheDocument();
    });

    it("should render product cards with correct information", () => {
        // Arrange
        const mockResults = [
            { _id: "1", name: "Test Product", description: "Test Description", price: 99.99 },
        ];
        useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

        // Act
        render(<Search />);

        // Assert
        expect(screen.getByText("Test Product")).toBeInTheDocument();
        expect(screen.getByText("Test Description...")).toBeInTheDocument();
        expect(screen.getByText("$ 99.99")).toBeInTheDocument();
    });

    it("should truncate long descriptions to 30 characters", () => {
        // Arrange
        const longDescription = "This is a very long product description that exceeds thirty characters";
        const mockResults = [
            { _id: "1", name: "Product", description: longDescription, price: 50 },
        ];
        useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

        // Act
        render(<Search />);

        // Assert
        expect(screen.getByText(`${longDescription.substring(0, 30)}...`)).toBeInTheDocument();
    });

    it("should render More Details and ADD TO CART buttons for each product", () => {
        // Arrange
        const mockResults = [
            { _id: "1", name: "Product 1", description: "Description", price: 100 },
        ];
        useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

        // Act
        render(<Search />);

        // Assert
        expect(screen.getByText("More Details")).toBeInTheDocument();
        expect(screen.getByText("ADD TO CART")).toBeInTheDocument();
    });

    it("should use correct product image URL", () => {
        // Arrange
        const mockResults = [
            { _id: "test-id-123", name: "Product", description: "Desc", price: 50 },
        ];
        useSearch.mockReturnValue([{ results: mockResults }, jest.fn()]);

        // Act
        render(<Search />);

        // Assert
        const img = screen.getByAltText("Product");
        expect(img.src).toBe("http://localhost/api/v1/product/product-photo/test-id-123");
    });
});