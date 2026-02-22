import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import CreateCategory from "./CreateCategory";

// Emberlynn Loo, A0255614E

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

jest.mock("antd", () => ({
    Modal: ({ children, open, onCancel }) =>
        open ? (
            <div>
                <button onClick={onCancel}>Close</button>
                {children}
            </div>
        ) : null,
}));

const mockCategories = [
    { _id: "c1", name: "Cat 1" },
    { _id: "c2", name: "Cat 2" },
];

describe("CreateCategory", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        axios.get.mockResolvedValue({
            data: { success: true, category: mockCategories },
        });
    });

    it("renders page with heading and form", async () => {
        //Arrange + Act
        render(<CreateCategory />);

        //Assert
        expect(screen.getByText("Manage Category")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Enter new category")).toBeInTheDocument();
    });

    it("gets and displays categories on initial load", async () => {
        //Arrange + Act
        render(<CreateCategory />);

        //Assert
        await waitFor(() => {
            expect(screen.getByText("Cat 1")).toBeInTheDocument();
            expect(screen.getByText("Cat 2")).toBeInTheDocument();
        });
    });

    it("shows error toast when getAllCategory fails", async () => {
        //Arrange
        axios.get.mockRejectedValueOnce(new Error("Network error"));

        //Act
        render(<CreateCategory />);

        //Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        });
    });

    it("submits new category successfully", async () => {
        //Arrange
        axios.post.mockResolvedValueOnce({ data: { success: true } });
        render(<CreateCategory />);

        //Act
        fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
            target: { value: "Cat 3" },
        });

        fireEvent.click(screen.getByText("Submit"));

        //Assert
        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                "/api/v1/category/create-category",
                { name: "Cat 3" }
            );
            expect(toast.success).toHaveBeenCalledWith("Cat 3 is created");
        });
    });

    it("shows error toast when creating category fails with false success", async () => {
        //Arrange
        axios.post.mockResolvedValueOnce({
            data: { success: false, message: "Already exists" },
        });
        render(<CreateCategory />);

        //Act
        fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
            target: { value: "Cat 1" },
        });

        fireEvent.click(screen.getByText("Submit"));

        //Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Already exists");
        });
    });

    it("does not set categories when success is false", async () => {
        //Arrange
        axios.get.mockResolvedValueOnce({
            data: { success: false, category: [] },
        });

        //Act
        render(<CreateCategory />);

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalled();
        });

        //Assert
        expect(screen.queryByText("Cat 1")).not.toBeInTheDocument();
    });

    it("shows error toast when creating category fails", async () => {
        //Arrange
        axios.post.mockRejectedValueOnce(new Error("Server error"));

        render(<CreateCategory />);

        //Act
        fireEvent.click(screen.getByText("Submit"));

        //Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong in input form");
        });
    });

    it("opens modal with selected category value when Edit is clicked", async () => {
        //Arrange
        render(<CreateCategory />);

        await waitFor(() => screen.getByText("Cat 1"));

        //Act
        fireEvent.click(screen.getAllByText("Edit")[0]);

        //Assert
        await waitFor(() => {
            const inputs = screen.getAllByPlaceholderText("Enter new category");
            expect(inputs.length).toBe(2);
            expect(inputs[1].value).toBe("Cat 1");
        });
    });

    it("updates category successfully", async () => {
        //Arrange
        axios.put.mockResolvedValueOnce({ data: { success: true } });
        render(<CreateCategory />);

        await waitFor(() => screen.getByText("Cat 1"));
        fireEvent.click(screen.getAllByText("Edit")[0]);
        await waitFor(() => screen.getByDisplayValue("Cat 1"));

        //Act
        const inputs = screen.getAllByPlaceholderText("Enter new category");

        fireEvent.change(inputs[inputs.length - 1], { target: { value: "Updated Cat 1" } });
        fireEvent.click(screen.getAllByText("Submit")[screen.getAllByText("Submit").length - 1]);

        //Assert
        await waitFor(() => {
            expect(axios.put).toHaveBeenCalled();
            expect(toast.success).toHaveBeenCalledWith("Updated Cat 1 is updated");
        });
    });

    it("shows error toast when updating fails with false success", async () => {
        //Arrange
        axios.put.mockResolvedValueOnce({
            data: { success: false, message: "Update failed" },
        });

        render(<CreateCategory />);

        await waitFor(() => screen.getByText("Cat 1"));
        fireEvent.click(screen.getAllByText("Edit")[0]);
        await waitFor(() => screen.getByDisplayValue("Cat 1"));

        //Act
        fireEvent.click(screen.getAllByText("Submit")[screen.getAllByText("Submit").length - 1]);

        //Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Update failed");
        });
    });

    it("shows error toast when category update fails", async () => {
        //Arrange
        axios.put.mockRejectedValueOnce(new Error("Server error"));
        render(<CreateCategory />);

        await waitFor(() => screen.getByText("Cat 1"));
        fireEvent.click(screen.getAllByText("Edit")[0]);
        await waitFor(() => {
            const inputs = screen.getAllByPlaceholderText("Enter new category");
            expect(inputs.length).toBe(2);
        });

        //Act
        fireEvent.click(screen.getAllByText("Submit")[screen.getAllByText("Submit").length - 1]);

        //Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });

    it("deletes category successfully", async () => {
        //Arrange
        axios.delete.mockResolvedValueOnce({ data: { success: true } });
        render(<CreateCategory />);

        await waitFor(() => screen.getByText("Cat 1"));

        //Act
        fireEvent.click(screen.getAllByText("Delete")[0]);

        //Assert
        await waitFor(() => {
            expect(axios.delete).toHaveBeenCalledWith(
                "/api/v1/category/delete-category/c1"
            );
            expect(toast.success).toHaveBeenCalledWith("category is deleted");
        });
    });

    it("shows error toast when deleting fails with false success", async () => {
        //Arrange
        axios.delete.mockResolvedValueOnce({
            data: { success: false, message: "Delete failed" },
        });
        render(<CreateCategory />);

        await waitFor(() => screen.getByText("Cat 1"));

        //Act
        fireEvent.click(screen.getAllByText("Delete")[0]);

        //Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Delete failed");
        });
    });

    it("shows error toast when delete fails", async () => {
        //Arrange
        axios.delete.mockRejectedValueOnce(new Error("Server error"));
        render(<CreateCategory />);

        await waitFor(() => screen.getByText("Cat 1"));

        //Act
        fireEvent.click(screen.getAllByText("Delete")[0]);

        //Assert
        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith("Something went wrong");
        });
    });

    it("closes modal when cancel is clicked", async () => {
        //Arrange
        render(<CreateCategory />);

        await waitFor(() => screen.getByText("Cat 1"));
        fireEvent.click(screen.getAllByText("Edit")[0]);
        await waitFor(() => {
            expect(screen.getAllByPlaceholderText("Enter new category").length).toBe(2);
        });

        //Act
        fireEvent.click(screen.getByText("Close"));

        //Assert
        await waitFor(() => {
            expect(screen.getAllByPlaceholderText("Enter new category").length).toBe(1);
        });
    });
});