import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";

jest.mock(
    "axios",
    () => ({
        __esModule: true,
        default: {
            get: jest.fn(),
            defaults: {
                headers: {
                    common: {},
                },
            },
        },
    }),
    { virtual: true }
);

import axios from "axios";
import SearchInput from "../../client/src/components/Form/SearchInput";
import { SearchProvider, useSearch } from "../../client/src/context/search";

const SearchStateProbe = () => {
    const [values] = useSearch();

    return (
        <div>
            <div data-testid="probe-keyword">{values.keyword}</div>
            <div data-testid="probe-results">{JSON.stringify(values.results)}</div>
        </div>
    );
};

const SearchResultsPage = () => {
    const [values] = useSearch();

    return (
        <div>
            <div data-testid="search-page">Search Page</div>
            <div data-testid="search-page-keyword">{values.keyword}</div>
            <div data-testid="search-page-results">
                {JSON.stringify(values.results)}
            </div>
        </div>
    );
};

const ContextSetter = () => {
    const [values, setValues] = useSearch();

    return (
        <button
            data-testid="set-keyword"
            onClick={() => setValues({ ...values, keyword: "laptop" })}
        >
            Set Keyword
        </button>
    );
};

const renderSearchInputIntegration = () => {
    return render(
        <MemoryRouter initialEntries={["/"]}>
            <SearchProvider>
                <Routes>
                    <Route
                        path="/"
                        element={
                            <>
                                <SearchInput />
                                <SearchStateProbe />
                                <ContextSetter />
                            </>
                        }
                    />
                    <Route path="/search" element={<SearchResultsPage />} />
                </Routes>
            </SearchProvider>
        </MemoryRouter>
    );
};

describe("SearchInput + SearchProvider Integration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Khoo Jing Xiang, A0252605L
    it("should update the real search context keyword when typing", () => {
        // Arrange
        renderSearchInputIntegration();
        const input = screen.getByRole("searchbox");

        // Act
        fireEvent.change(input, { target: { value: "mouse" } });

        // Assert
        expect(input).toHaveValue("mouse");
        expect(screen.getByTestId("probe-keyword")).toHaveTextContent("mouse");
    });

    // Khoo Jing Xiang, A0252605L
    it("should display the current keyword from the real search context in the input", () => {
        // Arrange
        renderSearchInputIntegration();
        const input = screen.getByRole("searchbox");

        // Act
        fireEvent.click(screen.getByTestId("set-keyword"));

        // Assert
        expect(screen.getByTestId("probe-keyword")).toHaveTextContent("laptop");
        expect(input).toHaveValue("laptop");
    });

    // Khoo Jing Xiang, A0252605L
    it("should call axios.get with the correct keyword in the URL when submitting", async () => {
        // Arrange
        axios.get.mockResolvedValue({
            data: [],
        });

        renderSearchInputIntegration();

        fireEvent.change(screen.getByRole("searchbox"), {
            target: { value: "keyboard" },
        });

        // Act
        fireEvent.click(screen.getByRole("button", { name: /search/i }));

        // Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith(
                "/api/v1/product/search/keyboard"
            );
        });
    });

    // Khoo Jing Xiang, A0252605L
    it("should store successful search results in the real search context", async () => {
        // Arrange
        const mockResults = [
            { _id: "1", name: "Gaming Mouse" },
            { _id: "2", name: "Wireless Keyboard" },
        ];

        axios.get.mockResolvedValue({
            data: mockResults,
        });

        renderSearchInputIntegration();

        fireEvent.change(screen.getByRole("searchbox"), {
            target: { value: "gaming" },
        });

        // Act
        fireEvent.click(screen.getByRole("button", { name: /search/i }));

        // Assert
        await waitFor(() => {
            expect(screen.getByTestId("search-page-results")).toHaveTextContent(
                JSON.stringify(mockResults)
            );
        });
    });

    // Khoo Jing Xiang, A0252605L
    it("should navigate to /search after successful submission", async () => {
        // Arrange
        axios.get.mockResolvedValue({
            data: [{ _id: "1", name: "Laptop Stand" }],
        });

        renderSearchInputIntegration();

        fireEvent.change(screen.getByRole("searchbox"), {
            target: { value: "laptop" },
        });

        // Act
        fireEvent.click(screen.getByRole("button", { name: /search/i }));

        // Assert
        await waitFor(() => {
            expect(screen.getByTestId("search-page")).toBeInTheDocument();
            expect(screen.getByTestId("search-page-keyword")).toHaveTextContent(
                "laptop"
            );
        });
    });
});
