import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Policy from "./Policy";

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

describe("Policy page", () => {
  it("should render inside Layout with correct title", () => {
    render(<Policy />);

    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("layout-title")).toHaveTextContent("Privacy Policy");
  });

  it("should render policy text blocks", () => {
    render(<Policy />);

    const items = screen.getAllByText(/add privacy policy/i);
    expect(items).toHaveLength(7);
  });

  it("should render image with correct src and alt text", () => {
    render(<Policy />);

    const img = screen.getByAltText("contactus");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/images/contactus.jpeg");
  });
});
