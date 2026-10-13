import React, { useState } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuthContext } from "../../context/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/utils/ui/card"
import { Button } from "@/utils/ui/button"
import { Input } from "@/utils/ui/input"

const success_route = '/';

export const Login = () => {
    const [userForm, setUserForm] = useState({ name: "prueba@gmail.com", password: "prueba123456" })
    const { user, login, loading, error } = useAuthContext();
    const navigate = useNavigate();
    const { t } = useTranslation();

    if (user) {
        return <Navigate to={success_route} replace />
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setUserForm({ ...userForm, [name]: value });
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const success = await login(userForm.name, userForm.password);
        if (success) {
            navigate(success_route);
        } else {
            setUserForm({ name: "", password: "" });
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl font-bold">{t('auth.login_title')}</CardTitle>
                    <CardDescription>{t('auth.login_subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded-lg text-sm border border-destructive/20">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">
                                {t('auth.email')}
                            </label>
                            <Input
                                id="name"
                                type="text"
                                name="name"
                                value={userForm.name}
                                onChange={handleChange}
                                placeholder={t('auth.email_placeholder')}
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                {t('auth.password')}
                            </label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                value={userForm.password}
                                onChange={handleChange}
                                placeholder={t('auth.password_placeholder')}
                                disabled={loading}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full cursor-pointer"
                            disabled={loading || !userForm.name || !userForm.password}
                        >
                            {loading ? t('auth.logging_in') : t('auth.login_submit')}
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                            {t('auth.no_account')}{" "}
                            <Button asChild variant="link" className="h-auto p-0 text-sm font-medium cursor-pointer">
                                <Link to="/register">{t('auth.create_account')}</Link>
                            </Button>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

