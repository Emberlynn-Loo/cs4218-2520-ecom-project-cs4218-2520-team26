import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Users from './Users';
import '@testing-library/jest-dom';

jest.mock('../../components/Layout', () => {
    return function MockLayout({ children, title }) {
        return (
            <div data-testid="layout" data-title={title}>
                {children}
            </div>
        );
    };
});

jest.mock('../../components/AdminMenu', () => {
    return function MockAdminMenu() {
        return <div data-testid="admin-menu">Admin Menu</div>;
    };
});

// Ashley Chang Le Xuan, A0252633J
describe('Users Component', () => {
    const renderComponent = () => {
        return render(
            <BrowserRouter>
                <Users />
            </BrowserRouter>
        );
    };

    it('should render Layout with correct title', () => {
        // Arrange
        // (component is stateless, no additional setup needed)

        // Act
        renderComponent();

        // Assert
        const layout = screen.getByTestId('layout');
        expect(layout).toHaveAttribute('data-title', 'Dashboard - All Users');
    });

    it('should render AdminMenu component', () => {
        // Arrange
        // (component is stateless, no additional setup needed)

        // Act
        renderComponent();

        // Assert
        expect(screen.getByTestId('admin-menu')).toBeInTheDocument();
    });

    it('should render All Users heading', () => {
        // Arrange
        // (component is stateless, no additional setup needed)

        // Act
        renderComponent();

        // Assert
        expect(screen.getByRole('heading', { name: 'All Users' })).toBeInTheDocument();
    });
});