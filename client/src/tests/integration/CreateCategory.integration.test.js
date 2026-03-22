// Emberlynn Loo, A0255614E

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import CreateCategory from "client/src/pages/admin/CreateCategory";

jest.mock(
    "axios",
    () => ({
        __esModule: true,
        default: {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
            defaults: { headers: { common: {} } },
        },
    }),
    { virtual: true }
);

jest.mock("react-hot-toast");

jest.mock("client/src/components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div>{children}</div>,
}));

jest.mock(
    "antd",
    () => {
        const Modal = ({ children, open, onCancel, footer }) =>
            open ? (
                <div data-testid="modal">
                    <button onClick={onCancel}>Close</button>
                    {children}
                </div>
            ) : null;
        return { Modal };
    },
    { virtual: true }
);

const mockCategories = [
    { _id: "c1", name: "Category 1" },
    { _id: "c2", name: "Category 2" },
];

const renderCreateCategory = () =>
    render(
        <MemoryRouter>
            <CreateCategory />
        </MemoryRouter>
    );

describe("CreateCategory integration with real AdminMenu", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        axios.get.mockResolvedValue({
            data: { success: true, category: mockCategories },
        });
        axios.post.mockResolvedValue({
            data: { success: true },
        });
        axios.put.mockResolvedValue({
            data: { success: true },
        });
        axios.delete.mockResolvedValue({
            data: { success: true },
        });
    });

    it("renders page with real AdminMenu showing all admin navigation links", async () => {
        // Act
        renderCreateCategory();

        // Assert
        expect(screen.getByText("Admin Panel")).toBeInTheDocument();
        expect(screen.getByText("Create Category")).toBeInTheDocument();
        expect(screen.getByText("Create Product")).toBeInTheDocument();
        expect(screen.getByText("Products")).toBeInTheDocument();
        expect(screen.getByText("Orders")).toBeInTheDocument();
        expect(screen.getByText("Users")).toBeInTheDocument();
    });

    it("AdminMenu links have correct hrefs", async () => {
        // Act
        renderCreateCategory();

        // Assert
        expect(screen.getByText("Create Category").closest("a")).toHaveAttribute(
            "href",
            "/dashboard/admin/create-category"
        );
        expect(screen.getByText("Create Product").closest("a")).toHaveAttribute(
            "href",
            "/dashboard/admin/create-product"
        );
        expect(screen.getByText("Products").closest("a")).toHaveAttribute(
            "href",
            "/dashboard/admin/products"
        );
        expect(screen.getByText("Orders").closest("a")).toHaveAttribute(
            "href",
            "/dashboard/admin/orders"
        );
        expect(screen.getByText("Users").closest("a")).toHaveAttribute(
            "href",
            "/dashboard/admin/users"
        );
    });

    it("fetches and displays existing categories in table when page loads", async () => {
        // Act
        renderCreateCategory();

        // Assert
        await waitFor(() => {
            expect(screen.getByText("Category 1")).toBeInTheDocument();
            expect(screen.getByText("Category 2")).toBeInTheDocument();
        });
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    it("creates new category and refetches list if it is successful", async () => {
        // Arrange
        const updatedCategories = [
            ...mockCategories,
            { _id: "c3", name: "New Category" },
        ];
        axios.get
            .mockResolvedValueOnce({
                data: { success: true, category: mockCategories },
            })
            .mockResolvedValueOnce({
                data: { success: true, category: updatedCategories },
            });

        renderCreateCategory();
        await waitFor(() => screen.getByText("Category 1"));

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
            target: { value: "New Category" },
        });
        fireEvent.click(screen.getByText("Submit"));

        // Assert
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                "/api/v1/category/create-category",
                { name: "New Category" }
            );
        });
        await waitFor(() => {
            expect(screen.getByText("New Category")).toBeInTheDocument();
        });
        expect(toast.success).toHaveBeenCalledWith("New Category is created");
    });

    it("shows error toast when category creation fails", async () => {
        // Arrange
        axios.post.mockResolvedValueOnce({
            data: { success: false, message: "Category already exists" },
        });
        renderCreateCategory();
        await waitFor(() => screen.getByText("Category 1"));

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
            target: { value: "Category 1" },
        });
        fireEvent.click(screen.getByText("Submit"));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Category already exists");
        });
    });

    it("opens modal when Edit button is clicked", async () => {
        // Arrange
        renderCreateCategory();
        await waitFor(() => screen.getByText("Category 1"));

        // Act
        fireEvent.click(screen.getAllByText("Edit")[0]);

        // Assert
        await waitFor(() => {
            expect(screen.getByTestId("modal")).toBeInTheDocument();
        });
    });

    it("submits edit and updates category list", async () => {
        // Arrange
        const updatedCategories = [
            { _id: "c1", name: "Updated Category 1" },
            { _id: "c2", name: "Category 2" },
        ];
        axios.get
            .mockResolvedValueOnce({
                data: { success: true, category: mockCategories },
            })
            .mockResolvedValueOnce({
                data: { success: true, category: updatedCategories },
            });

        renderCreateCategory();
        await waitFor(() => screen.getByText("Category 1"));
        fireEvent.click(screen.getAllByText("Edit")[0]);
        await waitFor(() => screen.getByTestId("modal"));

        // Act
        const inputs = screen.getAllByPlaceholderText("Enter new category");
        const modalInput = inputs[inputs.length - 1];
        fireEvent.change(modalInput, { target: { value: "Updated Category 1" } });
        const submitButtons = screen.getAllByText("Submit");
        fireEvent.click(submitButtons[submitButtons.length - 1]);

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalledWith(
                "/api/v1/category/update-category/c1",
                { name: "Updated Category 1" }
            );
        });
        await waitFor(() => {
            expect(screen.getByText("Updated Category 1")).toBeInTheDocument();
        });
        expect(toast.success).toHaveBeenCalledWith("Updated Category 1 is updated");
    });

    it("closes modal when cancel is clicked", async () => {
        // Arrange
        renderCreateCategory();
        await waitFor(() => screen.getByText("Category 1"));
        fireEvent.click(screen.getAllByText("Edit")[0]);
        await waitFor(() => screen.getByTestId("modal"));

        // Act
        fireEvent.click(screen.getByText("Close"));

        // Assert
        await waitFor(() => {
            expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
        });
    });

    it("deletes category and removes it from list", async () => {
        // Arrange
        const categoriesAfterDelete = [{ _id: "c2", name: "Category 2" }];
        axios.get
            .mockResolvedValueOnce({
                data: { success: true, category: mockCategories },
            })
            .mockResolvedValueOnce({
                data: { success: true, category: categoriesAfterDelete },
            });

        renderCreateCategory();
        await waitFor(() => screen.getByText("Category 1"));

        // Act
        fireEvent.click(screen.getAllByText("Delete")[0]);

        // Assert
        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalledWith(
                "/api/v1/category/delete-category/c1"
            );
        });
        await waitFor(() => {
            expect(screen.queryByText("Category 1")).not.toBeInTheDocument();
        });
        expect(toast.success).toHaveBeenCalledWith("category is deleted");
    });

    it("shows error toast when delete fails", async () => {
        // Arrange
        axios.delete.mockResolvedValueOnce({
            data: { success: false, message: "Delete failed" },
        });
        renderCreateCategory();
        await waitFor(() => screen.getByText("Category 1"));

        // Act
        fireEvent.click(screen.getAllByText("Delete")[0]);

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Delete failed");
        });
    });

});