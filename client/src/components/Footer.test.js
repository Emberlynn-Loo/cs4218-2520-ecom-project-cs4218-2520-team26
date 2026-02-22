import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import Footer from "./Footer";

// Khoo Jing Xiang, A0252605L

describe("Footer", () => {
  it("should render footer text", () => {
    // Arrange + Act
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    // Assert
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
    expect(screen.getByText(/testingcomp/i)).toBeInTheDocument();
  });

  it("should render links to About, Contact, Privacy Policy", () => {
    // Arrange
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    // Act
    const about = screen.getByRole("link", { name: /about/i });
    const contact = screen.getByRole("link", { name: /contact/i });
    const policy = screen.getByRole("link", { name: /privacy policy/i });

    // Assert
    expect(about).toHaveAttribute("href", "/about");
    expect(contact).toHaveAttribute("href", "/contact");
    expect(policy).toHaveAttribute("href", "/policy");
  });
});
