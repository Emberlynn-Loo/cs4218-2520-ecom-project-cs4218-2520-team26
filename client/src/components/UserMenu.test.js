import React from "react";
import { render, screen } from "@testing-library/react";
import UserMenu from "./UserMenu";

//Emberlynn Loo, A0255614E

jest.mock("react-router-dom", () => ({
    NavLink: ({ children, to, className }) => (
        <a href={to} className={className}>{children}</a>
    ),
}));

describe("UserMenu", () => {
    test("renders Dashboard heading", () => {
        //Arrange + Act
        render(<UserMenu />);

        //Assert
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    test("renders Profile link with correct href", () => {
        //Arrange + Act
        render(<UserMenu />);

        //Assert
        const profileLink = screen.getByText("Profile");

        expect(profileLink).toBeInTheDocument();
        expect(profileLink).toHaveAttribute("href", "/dashboard/user/profile");
    });

    test("renders Orders link with correct href", () => {
        //Arrange + Act
        render(<UserMenu />);

        //Assert
        const ordersLink = screen.getByText("Orders");
        expect(ordersLink).toBeInTheDocument();
        expect(ordersLink).toHaveAttribute("href", "/dashboard/user/orders");
    });

    test("renders two navigation links", () => {
        //Arrange + Act
        render(<UserMenu />);

        //Assert
        const links = screen.getAllByRole("link");
        expect(links).toHaveLength(2);
    });

    test("links have correct className", () => {
        //Arrange + Act
        render(<UserMenu />);

        //Assert
        const links = screen.getAllByRole("link");
        links.forEach(link => {
            expect(link).toHaveAttribute(
                "class",
                "list-group-item list-group-item-action"
            );
        });
    });
});