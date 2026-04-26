import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as AuthContext from '../context/AuthContext';
import { productApi } from '../api/productApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

vi.mock('../api/productApi', () => ({
    productApi: {
        getProducts: vi.fn(),
    },
}));

const mockLogout = vi.fn();

const defaultAuthContext = {
    isAuthenticated: true,
    user: { id: '1', email: 'admin@example.com', role: 'admin' as const, username: 'AdminUser' },
    login: vi.fn(),
    logout: mockLogout,
    checkAuth: vi.fn(),
    authExpiredMessage: '',
    clearAuthExpiredMessage: vi.fn(),
};

describe('DashboardPage 測試', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(AuthContext, 'useAuth').mockReturnValue(defaultAuthContext);
        (productApi.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    });

    const renderComponent = () => {
        render(
            <MemoryRouter>
                <DashboardPage />
            </MemoryRouter>
        );
    };

    describe('【前端元素】', () => {
        it('渲染載入中狀態', () => {
            // 延遲 mock 讓組件保持在載入中
            (productApi.getProducts as ReturnType<typeof vi.fn>).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve([]), 100))
            );
            renderComponent();
            expect(screen.getByText('載入商品中...')).toBeInTheDocument();
        });

        it('渲染管理員資訊與專屬連結', async () => {
            renderComponent();
            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            expect(screen.getByText('Welcome, AdminUser 👋')).toBeInTheDocument();
            expect(screen.getByText('管理員')).toBeInTheDocument();
            expect(screen.getByRole('link', { name: '🛠️ 管理後台' })).toBeInTheDocument();
        });

        it('渲染一般用戶資訊', async () => {
            vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
                ...defaultAuthContext,
                user: { id: '2', email: 'user@example.com', role: 'user' as const, username: 'NormalUser' },
            });
            renderComponent();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            expect(screen.getByText('Welcome, NormalUser 👋')).toBeInTheDocument();
            expect(screen.getByText('一般用戶')).toBeInTheDocument();
            expect(screen.queryByRole('link', { name: '🛠️ 管理後台' })).not.toBeInTheDocument();
        });
    });

    describe('【Mock API】', () => {
        it('成功獲取並顯示商品列表', async () => {
            const mockProducts = [
                { id: '1', name: '測試商品A', description: '這是A', price: 100, category: 'test', imageUrl: '', stock: 10 },
                { id: '2', name: '測試商品B', description: '這是B', price: 200, category: 'test', imageUrl: '', stock: 20 },
            ];
            (productApi.getProducts as ReturnType<typeof vi.fn>).mockResolvedValue(mockProducts);
            renderComponent();

            expect(await screen.findByText('測試商品A')).toBeInTheDocument();
            expect(screen.getByText('這是A')).toBeInTheDocument();
            expect(screen.getByText('NT$ 100')).toBeInTheDocument();
            
            expect(screen.getByText('測試商品B')).toBeInTheDocument();
            expect(screen.getByText('這是B')).toBeInTheDocument();
            expect(screen.getByText('NT$ 200')).toBeInTheDocument();
        });

        it('獲取商品失敗顯示錯誤訊息', async () => {
            (productApi.getProducts as ReturnType<typeof vi.fn>).mockRejectedValue({
                response: { data: { message: '伺服器異常' } }
            });
            renderComponent();

            expect(await screen.findByText('伺服器異常')).toBeInTheDocument();
            expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
        });

        it('獲取商品時遇到 401 錯誤處理', async () => {
            (productApi.getProducts as ReturnType<typeof vi.fn>).mockRejectedValue({
                response: { status: 401, data: { message: 'Unauthorized' } }
            });
            renderComponent();

            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });
            // 不應顯示錯誤區塊
            expect(screen.queryByText('Unauthorized')).not.toBeInTheDocument();
            expect(screen.queryByText('無法載入商品資料')).not.toBeInTheDocument();
        });
    });

    describe('【function 邏輯】', () => {
        it('執行登出操作', async () => {
            renderComponent();
            
            await waitFor(() => {
                expect(screen.queryByText('載入商品中...')).not.toBeInTheDocument();
            });

            const logoutButton = screen.getByRole('button', { name: '登出' });
            fireEvent.click(logoutButton);
            
            expect(mockLogout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true, state: null });
        });
    });
});
