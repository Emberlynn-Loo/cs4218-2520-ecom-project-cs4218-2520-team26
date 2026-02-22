import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CategoryForm from "./CategoryForm";

//Emberlynn Loo, A0255614E

describe("CategoryForm", () => {
    it("renders input field and submit button", () => {
        //Arrange + Act
        render(<CategoryForm handleSubmit={jest.fn()} value="" setValue={jest.fn()} />);

        //Assert
        expect(screen.getByPlaceholderText("Enter new category")).toBeInTheDocument();
        expect(screen.getByText("Submit")).toBeInTheDocument();
    });

    it("displays the current value in input", () => {
        //Arrange + Act
        render(<CategoryForm handleSubmit={jest.fn()} value="Sample Category" setValue={jest.fn()} />);

        //Assert
        expect(screen.getByDisplayValue("Sample Category")).toBeInTheDocument();
    });

    it("calls setValue when user types in input", () => {
        //Arrange
        const setValue = jest.fn();
        render(<CategoryForm handleSubmit={jest.fn()} value="" setValue={setValue} />);

        //Act
        fireEvent.change(screen.getByPlaceholderText("Enter new category"), {
            target: { value: "Sample Category 2" },
        });

        //Assert
        expect(setValue).toHaveBeenCalledWith("Sample Category 2");
    });

    it("calls handleSubmit when form is submitted", () => {
        //Arrange
        const handleSubmit = jest.fn((e) => e.preventDefault());
        render(<CategoryForm handleSubmit={handleSubmit} value="Sample Category 2" setValue={jest.fn()} />);

        //Act
        fireEvent.submit(screen.getByRole("button", { name: /submit/i }));

        //Assert
        expect(handleSubmit).toHaveBeenCalled();
    });

    it("calls handleSubmit when submit button is clicked", () => {
        //Arrange
        const handleSubmit = jest.fn((e) => e.preventDefault());
        render(<CategoryForm handleSubmit={handleSubmit} value="Sample Category 2" setValue={jest.fn()} />);

        //Act
        fireEvent.click(screen.getByText("Submit"));

        //Assert
        expect(handleSubmit).toHaveBeenCalled();
    });

    it("input is empty when value prop is empty string", () => {
        //Arrange
        render(<CategoryForm handleSubmit={jest.fn()} value="" setValue={jest.fn()} />);

        //Act
        const input = screen.getByPlaceholderText("Enter new category");

        //Assert
        expect(input.value).toBe("");
    });
});