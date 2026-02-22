import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import CreateProduct from "./CreateProduct";

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
    const Select = ({ children, onChange, placeholder }) => (
        <select
            onChange={(e) => onChange && onChange(e.target.value)}
            aria-label={placeholder}
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

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate,
}));

const mockCategories = [
    { _id: "c1", name: "Cat 1" },
    { _id: "c2", name: "Cat 2" },
];

global.URL.createObjectURL = jest.fn(() => "fake-url");

describe("CreateProduct", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        axios.get.mockResolvedValue({
            data: { success: true, category: mockCategories },
        });
    });

    it("renders page with all form fields", async () => {
        //Arrange + Act
        render(<CreateProduct />);

        //Assert
        expect(screen.getByText("Create Product")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("write a name")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("write a description")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("write a Price")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("write a quantity")).toBeInTheDocument();
        expect(screen.getByText("CREATE PRODUCT")).toBeInTheDocument();
    });

    it("loads categories on initial load", async () => {
        //Arrange + Act
        render(<CreateProduct />);

        //Assert
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });

        await waitFor(() => {
            expect(screen.getByText("Cat 1")).toBeInTheDocument();
        });
    });

    it("shows error toast when category fetch fails", async () => {
        //Arrange
        axios.get.mockRejectedValueOnce(new Error("Network error"));

        //Act
        render(<CreateProduct />);

        //Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(
                "Something went wrong in getting category"
            );
        });
    });

    it("does not set categories when success is false", async () => {
        //Arrange
        axios.get.mockResolvedValueOnce({ data: { success: false } });

        //Act
        render(<CreateProduct />);

        await waitFor(() => expect(axios.get).toHaveBeenCalled());

        //Assert
        expect(screen.queryByText("Cat 1")).not.toBeInTheDocument();
    });

    it("updates name input when typed", () => {
        //Arrange
        render(<CreateProduct />);

        //Act
        fireEvent.change(screen.getByPlaceholderText("write a name"), {
            target: { value: "Sample Product" },
        });

        //Assert
        expect(screen.getByDisplayValue("Sample Product")).toBeInTheDocument();
    });

    it("updates description when typed", () => {
        //Arrange
        render(<CreateProduct />);

        //Act
        fireEvent.change(screen.getByPlaceholderText("write a description"), {
            target: { value: "Test Description" },
        });

        //Assert
        expect(screen.getByDisplayValue("Test Description")).toBeInTheDocument();
    });

    it("updates price when typed", () => {
        //Arrange
        render(<CreateProduct />);

        //Act
        fireEvent.change(screen.getByPlaceholderText("write a Price"), {
            target: { value: "69" },
        });

        //Assert
        expect(screen.getByDisplayValue("69")).toBeInTheDocument();
    });

    it("updates quantity when typed", () => {
        //Arrange
        render(<CreateProduct />);

        //Act
        fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
            target: { value: "10" },
        });

        //Assert
        expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    });

    it("shows Upload Photo label initially", () => {
        //Arrange + Act
        render(<CreateProduct />);

        //Assert
        expect(screen.getByText("Upload Photo")).toBeInTheDocument();
    });

    it("creates product successfully and navigates", async () => {
        //Arrange
        axios.post.mockResolvedValueOnce({ data: { success: true } });
        render(<CreateProduct />);

        fireEvent.change(screen.getByPlaceholderText("write a name"), {
            target: { value: "Test Product" },
        });

        //Act
        fireEvent.click(screen.getByText("CREATE PRODUCT"));

        //Assert
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith("Product Created Successfully");
            expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
        });
    });

    it("shows error toast when creating product returns false success", async () => {
        //Arrange
        axios.post.mockResolvedValueOnce({ data: { success: false, message: "Creation failed" } });

        render(<CreateProduct />);

        //Act
        fireEvent.click(screen.getByText("CREATE PRODUCT"));

        //Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Creation failed");
        });
    });

    it("shows error toast when product creation fails", async () => {
        //Arrange
        axios.post.mockRejectedValueOnce(new Error("Server error"));

        render(<CreateProduct />);

        //Act
        fireEvent.click(screen.getByText("CREATE PRODUCT"));

        //Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("something went wrong");
        });
    });

    it("sets category when Select category changes", async () => {
        //Arrange
        render(<CreateProduct />);

        await waitFor(() => screen.getByText("Cat 1"));
        const categorySelect = screen.getByRole("combobox", { name: /Select a category/i });

        //Act
        fireEvent.change(categorySelect, { target: { value: "c1" } });

        //Assert
        expect(categorySelect.value).toBe("c1");
    });

    it("sets shipping when Select Shipping changes", async () => {
        //Arrange
        render(<CreateProduct />);

        const shippingSelect = screen.getByRole("combobox", { name: /Select Shipping/i });

        //Act
        fireEvent.change(shippingSelect, { target: { value: "1" } });

        //Assert
        expect(shippingSelect.value).toBe("1");
    });

    it("sets photo when file is uploaded and shows filename", () => {
        //Arrange
        render(<CreateProduct />);

        const fakeFile = new File(["image"], "photo.jpg", { type: "image/jpeg" });
        const fileInput = document.querySelector('input[type="file"]');

        //Act
        fireEvent.change(fileInput, { target: { files: [fakeFile] } });

        //Assert
        expect(screen.getByText("photo.jpg")).toBeInTheDocument();
    });
});