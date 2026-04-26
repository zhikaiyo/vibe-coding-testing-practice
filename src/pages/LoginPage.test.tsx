import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as AuthContext from '../context/AuthContext';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock AuthContext
const mockLogin = vi.fn();
const mockClearAuthExpiredMessage = vi.fn();

const defaultAuthContext = {
    isAuthenticated: false,
    user: null,
    login: mockLogin,
    logout: vi.fn(),
    checkAuth: vi.fn(),
    authExpiredMessage: '',
    clearAuthExpiredMessage: mockClearAuthExpiredMessage,
};

vi.spyOn(AuthContext, 'useAuth').mockReturnValue(defaultAuthContext);

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(AuthContext, 'useAuth').mockReturnValue(defaultAuthContext);
    });

    const renderComponent = () => {
        render(
            <MemoryRouter>
                <LoginPage />
            </MemoryRouter>
        );
    };

    describe('【前端元素】', () => {
        it('渲染登入頁面', () => {
            renderComponent();
            expect(screen.getByLabelText('電子郵件')).toBeInTheDocument();
            expect(screen.getByLabelText('密碼')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '登入' })).toBeInTheDocument();
        });

        it('已登入狀態導向', () => {
            vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
                ...defaultAuthContext,
                isAuthenticated: true,
            });
            renderComponent();
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
        });

        it('顯示登入過期訊息', () => {
            vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
                ...defaultAuthContext,
                authExpiredMessage: '登入已過期',
            });
            renderComponent();
            expect(screen.getByText('登入已過期')).toBeInTheDocument();
            expect(mockClearAuthExpiredMessage).toHaveBeenCalled();
        });

        it('載入中狀態顯示', async () => {
            // 延遲 mockLogin 以觀察載入狀態
            mockLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));
            renderComponent();

            await userEvent.type(screen.getByLabelText('電子郵件'), 'test@example.com');
            await userEvent.type(screen.getByLabelText('密碼'), 'Password123');
            
            const submitButton = screen.getByRole('button', { name: '登入' });
            fireEvent.click(submitButton);

            expect(submitButton).toHaveTextContent('登入中...');
            expect(screen.getByLabelText('電子郵件')).toBeDisabled();
            expect(screen.getByLabelText('密碼')).toBeDisabled();
            expect(submitButton).toBeDisabled();

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
            });
        });
    });

    describe('【function 邏輯】', () => {
        it('Email 格式驗證失敗', async () => {
            renderComponent();
            await userEvent.type(screen.getByLabelText('電子郵件'), 'invalid-email');
            fireEvent.click(screen.getByRole('button', { name: '登入' }));

            expect(await screen.findByText('請輸入有效的 Email 格式')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });

        it('密碼長度驗證失敗', async () => {
            renderComponent();
            await userEvent.type(screen.getByLabelText('電子郵件'), 'test@example.com');
            await userEvent.type(screen.getByLabelText('密碼'), '123');
            fireEvent.click(screen.getByRole('button', { name: '登入' }));

            expect(await screen.findByText('密碼必須至少 8 個字元')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });

        it('密碼複雜度驗證失敗', async () => {
            renderComponent();
            await userEvent.type(screen.getByLabelText('電子郵件'), 'test@example.com');
            const passwordInput = screen.getByLabelText('密碼');
            const submitButton = screen.getByRole('button', { name: '登入' });

            // 只有數字
            await userEvent.type(passwordInput, '12345678');
            fireEvent.click(submitButton);
            expect(await screen.findByText('密碼必須包含英文字母和數字')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();

            // 只有字母
            await userEvent.clear(passwordInput);
            await userEvent.type(passwordInput, 'abcdefgh');
            fireEvent.click(submitButton);
            expect(await screen.findByText('密碼必須包含英文字母和數字')).toBeInTheDocument();
            expect(mockLogin).not.toHaveBeenCalled();
        });
    });

    describe('【Mock API】', () => {
        it('登入成功', async () => {
            mockLogin.mockResolvedValueOnce(undefined);
            renderComponent();

            await userEvent.type(screen.getByLabelText('電子郵件'), 'user@example.com');
            await userEvent.type(screen.getByLabelText('密碼'), 'Password123');
            fireEvent.click(screen.getByRole('button', { name: '登入' }));

            await waitFor(() => {
                expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'Password123');
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
            });
        });

        it('登入失敗顯示錯誤訊息', async () => {
            mockLogin.mockRejectedValueOnce({
                response: { data: { message: '帳號或密碼錯誤' } }
            });
            renderComponent();

            await userEvent.type(screen.getByLabelText('電子郵件'), 'user@example.com');
            await userEvent.type(screen.getByLabelText('密碼'), 'WrongPassword123');
            fireEvent.click(screen.getByRole('button', { name: '登入' }));

            expect(await screen.findByText('帳號或密碼錯誤')).toBeInTheDocument();
        });
    });
});
