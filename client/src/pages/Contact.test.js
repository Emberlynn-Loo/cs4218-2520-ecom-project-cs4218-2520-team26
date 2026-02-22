import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Contact from "./Contact";

// Khoo Jing Xiang, A0252605L

jest.mock("./../components/Layout", () => {
  return function MockLayout({ children, title }) {
    return (
      <div data-testid="layout">
        <div data-testid="layout-title">{title}</div>
        {children}
      </div>
    );
  };
});

jest.mock("react-icons/bi", () => ({
  BiMailSend: () => <span data-testid="icon-mail" />,
  BiPhoneCall: () => <span data-testid="icon-phone" />,
  BiSupport: () => <span data-testid="icon-support" />,
}));

describe("Contact page", () => {
  it("should render inside Layout with correct title", () => {
    render(<Contact />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("layout-title")).toHaveTextContent("Contact us");
  });

  it("should render heading and description", () => {
    render(<Contact />);

    expect(
      screen.getByRole("heading", { name: /contact us/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/for any query or info about product/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/available 24x7/i)).toBeInTheDocument();
  });

  it("should render contact details (email, phone, support)", () => {
    render(<Contact />);

    expect(
      screen.getByText(/www\.help@ecommerceapp\.com/i)
    ).toBeInTheDocument();

    expect(screen.getByText(/012-3456789/i)).toBeInTheDocument();

    expect(screen.getByText(/1800-0000-0000/i)).toBeInTheDocument();
    expect(screen.getByText(/\(toll free\)/i)).toBeInTheDocument();

    expect(screen.getByTestId("icon-mail")).toBeInTheDocument();
    expect(screen.getByTestId("icon-phone")).toBeInTheDocument();
    expect(screen.getByTestId("icon-support")).toBeInTheDocument();
  });

  it("should render contact image with correct src and alt text", () => {
    render(<Contact />);

    const img = screen.getByAltText("contactus");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
  });
});
