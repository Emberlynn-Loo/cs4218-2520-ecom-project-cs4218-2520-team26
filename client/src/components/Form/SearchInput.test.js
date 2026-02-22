import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter as Router } from "react-router-dom";
import axios from "axios";
import SearchInput from "./SearchInput";
import { SearchProvider } from "../../context/search";

jest.mock("axios");
jest.mock("react-router-dom", () => ({
    ...jest.requireActual("react-router-dom"),
    useNavigate: () => jest.fn(),
}));

const renderComponent = () => {
    return render(
        <Router>
            <SearchProvider>
                <SearchInput />
            </SearchProvider>
        </Router>
    );
};

// Ashley Chang Le Xuan, A0252633J
describe("SearchInput Component", () => {
    let mockNavigate;

    beforeEach(() => {
        jest.clearAllMocks();
        mockNavigate = jest.fn();
        jest.spyOn(require("react-router-dom"), "useNavigate").mockReturnValue(mockNavigate);
    });

    describe("Form Rendering", () => {
        it("should render search input field", () => {
            // Arrange
            // (component is stateless, no additional setup needed)

            // Act
            renderComponent();

            // Assert
            expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
        });

        it("should render search button", () => {
            // Arrange
            // (component is stateless, no additional setup needed)

            // Act
            renderComponent();

            // Assert
            expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
        });

        it("should render input with empty value initially", () => {
            // Arrange
            // (component is stateless, no additional setup needed)

            // Act
            renderComponent();

            // Assert
            expect(screen.getByPlaceholderText("Search").value).toBe("");
        });
    });

    describe("Form Interaction", () => {
        it("should update keyword state on input change", () => {
            // Arrange
            renderComponent();
            const input = screen.getByPlaceholderText("Search");

            // Act
            fireEvent.change(input, { target: { value: "laptop" } });

            // Assert
            expect(input.value).toBe("laptop");
        });
    });

    describe("Form Submission", () => {
        it("should call API with keyword and navigate to /search on success (EP: Valid keyword)", async () => {
            // Arrange
            axios.get.mockResolvedValueOnce({ data: [{ id: 1, name: "Product" }] });
            renderComponent();
            const input = screen.getByPlaceholderText("Search");
            const button = screen.getByRole("button", { name: /search/i });

            // Act
            fireEvent.change(input, { target: { value: "laptop" } });
            fireEvent.click(button);

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/laptop");
                expect(mockNavigate).toHaveBeenCalledWith("/search");
            });
        });

        it("should call API with empty string when no keyword entered (EP: Empty keyword)", async () => {
            // Arrange
            axios.get.mockResolvedValueOnce({ data: [] });
            renderComponent();
            const button = screen.getByRole("button", { name: /search/i });

            // Act
            fireEvent.click(button);

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/product/search/");
            });
        });

        it("should handle API error gracefully (EP: API error)", async () => {
            // Arrange
            const mockError = new Error("Network error");
            axios.get.mockRejectedValueOnce(mockError);
            jest.spyOn(console, "log").mockImplementation(() => {});
            renderComponent();
            const input = screen.getByPlaceholderText("Search");
            const button = screen.getByRole("button", { name: /search/i });

            // Act
            fireEvent.change(input, { target: { value: "laptop" } });
            fireEvent.click(button);

            // Assert
            await waitFor(() => {
                expect(console.log).toHaveBeenCalledWith(mockError);
                expect(mockNavigate).not.toHaveBeenCalled();
            });

            console.log.mockRestore();
        });
    });
});