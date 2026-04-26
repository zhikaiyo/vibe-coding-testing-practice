import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminPage } from './AdminPage';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as AuthContext from '../context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const mockLogout = vi.fn();

const defaultAuthContext = {
    isAuthenticated: true,
    user: { id: '1', email: 'admin@example.com', role: 'admin' as const, username: 'Admin' },
    login: vi.fn(),
    logout: mockLogout,
    checkAuth: vi.fn(),
    authExpiredMessage: '',
    clearAuthExpiredMessage: vi.fn(),
};

describe('AdminPage 測試', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(AuthContext, 'useAuth').mockReturnValue(defaultAuthContext);
    });

    const renderComponent = () => {
        render(
            <MemoryRouter>
                <AdminPage />
            </MemoryRouter>
        );
    };

    describe('【前端元素】', () => {
        it('渲染管理後台頁面', () => {
            renderComponent();
            expect(screen.getByRole('heading', { name: '🛠️ 管理後台' })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: '← 返回' })).toBeInTheDocument();
            expect(screen.getByText('管理員專屬頁面')).toBeInTheDocument();
        });

        it('顯示管理員標籤', () => {
            renderComponent();
            const badge = screen.getByText('管理員');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('role-badge', 'admin');
        });

        it('顯示一般用戶標籤', () => {
            vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
                ...defaultAuthContext,
                user: { id: '2', email: 'user@example.com', role: 'user' as const, username: 'User' },
            });
            renderComponent();
            const badge = screen.getByText('一般用戶');
            expect(badge).toBeInTheDocument();
            expect(badge).toHaveClass('role-badge', 'user');
        });
    });

    describe('【function 邏輯】', () => {
        it('點擊返回連結', () => {
            renderComponent();
            const backLink = screen.getByRole('link', { name: '← 返回' });
            expect(backLink).toHaveAttribute('href', '/dashboard');
        });
    });

    describe('【Mock API】', () => {
        it('執行登出操作', () => {
            renderComponent();
            const logoutButton = screen.getByRole('button', { name: '登出' });
            fireEvent.click(logoutButton);
            
            expect(mockLogout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true, state: null });
        });
    });
});
