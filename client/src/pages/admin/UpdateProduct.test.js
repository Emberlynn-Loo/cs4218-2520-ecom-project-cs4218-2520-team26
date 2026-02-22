import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import UpdateProduct from "./UpdateProduct";

//Emberlynn Loo, A0255614E

jest.mock("axios");

jest.mock("react-hot-toast");

jest.mock("./../../components/Layout", () => ({
    __esModule: true,
    default: ({ children }) => <div>{children}</div>,
}));
jest.mock("./../../components/AdminMenu", () => ({
    __esModule: true,
    default: () => <div>AdminMenu</div>,
}));

jest.mock("antd", () => {
    const Select = ({ children, onChange, placeholder, value }) => (
        <select
            aria-label={placeholder}
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
        >
            <option value="">{placeholder}</option>
            {children}
        </select>
    );
    Select.Option = ({ value, children }) => (
        <option value={value}>{children}</option>
    );
    return { Select };
});

global.URL.createObjectURL = jest.fn(() => "fake-url");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate,
    useParams: jest.fn(),
}));

const mockProduct = {
    product: {
        _id: "p1",
        name: "Product 1",
        description: "Test description",
        price: 999,
        quantity: 5,
        shipping: true,
        category: { _id: "c1" },
    },
};
const mockCategories = [
    { _id: "c1", name: "Cat 1" },
    { _id: "c2", name: "Cat 2" },
];

describe("UpdateProduct", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useParams.mockReturnValue({ slug: "test-product" });

        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) {
                return Promise.resolve({ data: mockProduct });
            }
            return Promise.resolve({
                data: { success: true, category: mockCategories },
            });
        });
    });

    it("renders Update Product page", async () => {
        // Arrange + Act
        render(<UpdateProduct />);

        // Assert
        expect(screen.getByText("Update Product")).toBeInTheDocument();
        expect(screen.getByText("UPDATE PRODUCT")).toBeInTheDocument();
        expect(screen.getByText("DELETE PRODUCT")).toBeInTheDocument();
    });

    it("loads product data into form fields on initial load", async () => {
        // Arrange + Act
        render(<UpdateProduct />);

        // Assert
        await waitFor(() => {
            expect(screen.getByDisplayValue("Product 1")).toBeInTheDocument();
            expect(screen.getByDisplayValue("Test description")).toBeInTheDocument();
            expect(screen.getByDisplayValue("999")).toBeInTheDocument();
            expect(screen.getByDisplayValue("5")).toBeInTheDocument();
        });
    });

    it("loads categories on initial load", async () => {
        // Arrange + Act
        render(<UpdateProduct />);

        // Assert
        await waitFor(() => {
            expect(screen.getByText("Cat 1")).toBeInTheDocument();
        });
    });

    it("shows error toast when getAllCategory fails", async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) return Promise.resolve({ data: mockProduct });
            return Promise.reject(new Error("Network error"));
        });

        // Act
        render(<UpdateProduct />);

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "Something wwent wrong in getting catgeory"
            );
        });
    });

    it("does not set categories when success is false", async () => {
        // Arrange
        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) return Promise.resolve({ data: mockProduct });
            return Promise.resolve({ data: { success: false } });
        });

        // Act
        render(<UpdateProduct />);

        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        // Assert
        expect(screen.queryByText("Cat 1")).not.toBeInTheDocument();
    });

    it("logs error when getSingleProduct fails", async () => {
        // Arrange
        const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

        axios.get.mockImplementation((url) => {
            if (url.includes("get-product")) return Promise.reject(new Error("fetch failed"));
            return Promise.resolve({ data: { success: true, category: mockCategories } });
        });

        // Act
        render(<UpdateProduct />);

        // Assert
        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalled();
        });
        consoleSpy.mockRestore();
    });

    it("updates name input when typed", async () => {
        // Arrange
        render(<UpdateProduct />);

        await waitFor(() => screen.getByDisplayValue("Product 1"));

        // Act
        fireEvent.change(screen.getByPlaceholderText("write a name"), {
            target: { value: "New Name" },
        });

        // Assert
        expect(screen.getByDisplayValue("New Name")).toBeInTheDocument();
    });

    it("updates description when typed", async () => {
        // Arrange
        render(<UpdateProduct />);

        await waitFor(() => screen.getByDisplayValue("Test description"));

        // Act
        fireEvent.change(screen.getByPlaceholderText("write a description"), {
            target: { value: "New description" },
        });

        // Assert
        expect(screen.getByDisplayValue("New description")).toBeInTheDocument();
    });

    it("updates price when typed", async () => {
        // Arrange
        render(<UpdateProduct />);

        await waitFor(() => screen.getByDisplayValue("999"));

        // Act
        fireEvent.change(screen.getByPlaceholderText("write a Price"), {
            target: { value: "199" },
        });

        // Assert
        expect(screen.getByDisplayValue("199")).toBeInTheDocument();
    });

    it("updates quantity when typed", async () => {
        // Arrange
        render(<UpdateProduct />);

        await waitFor(() => screen.getByDisplayValue("5"));

        // Act
        fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
            target: { value: "20" },
        });

        // Assert
        expect(screen.getByDisplayValue("20")).toBeInTheDocument();
    });

    it("sets category when dropdown changes", async () => {
        // Arrange
        render(<UpdateProduct />);

        await waitFor(() => screen.getByText("Cat 1"));
        const categorySelect = screen.getByRole("combobox", { name: /select a category/i });

        // Act
        fireEvent.change(categorySelect, { target: { value: "c2" } });

        // Assert
        expect(categorySelect.value).toBe("c2");
    });

    it("sets shipping when dropdown changes", async () => {
        // Arrange
        render(<UpdateProduct />);

        const shippingSelect = screen.getByRole("combobox", { name: /select shipping/i });

        // Act
        fireEvent.change(shippingSelect, { target: { value: "1" } });

        // Assert
        expect(shippingSelect).toBeInTheDocument();
    });

    it("shows filename and photo preview when file uploaded", async () => {
        // Arrange
        render(<UpdateProduct />);

        const fakeFile = new File(["image"], "newphoto.jpg", { type: "image/jpeg" });
        const fileInput = document.querySelector('input[type="file"]');

        // Act
        fireEvent.change(fileInput, { target: { files: [fakeFile] } });

        // Assert
        await waitFor(() => {
            expect(screen.getByText("newphoto.jpg")).toBeInTheDocument();
        });
    });

    it("updates product successfully and navigates", async () => {
        // Arrange
        axios.put.mockResolvedValueOnce({ data: { success: true } });

        render(<UpdateProduct />);

        await waitFor(() => screen.getByDisplayValue("Product 1"));

        // Act
        fireEvent.click(screen.getByText("UPDATE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
        });
    });

    it("shows error toast when update returns success false", async () => {
        // Arrange
        axios.put.mockResolvedValueOnce({ data: { success: false, message: "Update failed" } });

        render(<UpdateProduct />);

        await waitFor(() => screen.getByDisplayValue("Product 1"));

        // Act
        fireEvent.click(screen.getByText("UPDATE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Update failed");
        });
    });

    it("shows error toast when update fails", async () => {
        // Arrange
        axios.put.mockRejectedValueOnce(new Error("Server error"));

        render(<UpdateProduct />);

        await waitFor(() => screen.getByDisplayValue("Product 1"));

        // Act
        fireEvent.click(screen.getByText("UPDATE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("something went wrong");
        });
    });

    it("deletes product when prompt is confirmed", async () => {
        // Arrange
        window.prompt = jest.fn().mockReturnValue("yes");
        axios.delete.mockResolvedValueOnce({ data: { success: true } });

        render(<UpdateProduct />);

        await waitFor(() => screen.getByDisplayValue("Product 1"));

        // Act
        fireEvent.click(screen.getByText("DELETE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith("Product Deleted Successfully");
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
        });
    });

    it("shows error toast when delete returns success false", async () => {
        // Arrange
        axios.delete.mockResolvedValueOnce({ data: { success: false, message: "Delete failed" } });

        render(<UpdateProduct />);

        await waitFor(() => screen.getByDisplayValue("Product 1"));

        // Act
        fireEvent.click(screen.getByText("DELETE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Delete failed");
        });
    });

    it("does not delete when prompt is cancelled", async () => {
        // Arrange
        window.prompt = jest.fn().mockReturnValue(null);

        render(<UpdateProduct />);

        await waitFor(() => screen.getByDisplayValue("Product 1"));

        // Act
        fireEvent.click(screen.getByText("DELETE PRODUCT"));

        // Assert
        expect(axios.delete).not.toHaveBeenCalled();
    });

    it("shows error toast when delete fails", async () => {
        // Arrange
        window.prompt = jest.fn().mockReturnValue("yes");
        axios.delete.mockRejectedValueOnce(new Error("Delete failed"));

        render(<UpdateProduct />);

        await waitFor(() => screen.getByDisplayValue("Product 1"));

        // Act
        fireEvent.click(screen.getByText("DELETE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });

    it("appends photo to form data when photo is set", async () => {
        // Arrange
        axios.put.mockResolvedValueOnce({ data: { success: true } });
        render(<UpdateProduct />);

        await waitFor(() => screen.getByDisplayValue("Product 1"));
        const fakeFile = new File(["image"], "test.jpg", { type: "image/jpeg" });
        const fileInput = document.querySelector('input[type="file"]');

        fireEvent.change(fileInput, { target: { files: [fakeFile] } });
        await waitFor(() => screen.getByText("test.jpg"));

        // Act
        fireEvent.click(screen.getByText("UPDATE PRODUCT"));

        // Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
        });
    });
});