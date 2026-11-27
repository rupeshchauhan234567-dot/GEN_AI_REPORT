import { useCallback, useContext, useEffect } from "react";
import { AuthContext } from "../auth.context.js";
import { login, register, logout, getMe, verifyEmail, resendVerificationOtp } from "../services/auth.api";



export const useAuth = () => {

    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context


    const handleLogin = useCallback(async ({ email, password }) => {
        setLoading(true);
        try {
            const data = await login({ email, password });
            setUser(data.user);
            return data;
        } finally {
            setLoading(false);
        }
    }, [setLoading, setUser]);

    const handleRegister = useCallback(async ({ username, email, password }) => {
        setLoading(true);
        try {
            const data = await register({ username, email, password });
            // Registration only creates an unverified account. Do not authenticate yet.
            return data;
        } finally {
            setLoading(false);
        }
    }, [setLoading]);

    const handleVerifyEmail = useCallback(async ({ email, otp }) => {
        setLoading(true);
        try {
            const data = await verifyEmail({ email, otp });
            try { const me = await getMe(); setUser(me.user); } catch { if (data.user) setUser(data.user); }
            return data;
        } finally { setLoading(false); }
    }, [setLoading, setUser]);

    const handleResendOtp = useCallback(({ email }) => resendVerificationOtp({ email }), []);

    const handleLogout = useCallback(async () => {
        setLoading(true);
        try {
            await logout();
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, [setLoading, setUser]);

    useEffect(() => {
        const getAndSetUser = async () => {
            try {
                const data = await getMe();
                setUser(data.user);
            } catch {
                // A missing/expired session means the visitor is unauthenticated.
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        getAndSetUser();
    }, [setLoading, setUser]);

    return { user, loading, handleRegister, handleLogin, handleVerifyEmail, handleResendOtp, handleLogout }
}