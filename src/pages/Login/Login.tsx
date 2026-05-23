import React, { useState } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { useAuthContext } from "../../context/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"

const success_route = '/';

export const Login = () => {
    const [userForm, setUserForm] = useState({ name: "", password: "" })
    const { user, login, loading, error } = useAuthContext();
    const navigate = useNavigate();

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
                    <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
                    <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
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
                                Email
                            </label>
                            <Input
                                id="name"
                                type="text"
                                name="name"
                                value={userForm.name}
                                onChange={handleChange}
                                placeholder="Ingresa tu email"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                Contraseña
                            </label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                value={userForm.password}
                                onChange={handleChange}
                                placeholder="Ingresa tu contraseña"
                                disabled={loading}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading || !userForm.name || !userForm.password}
                        >
                            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                            ¿No tienes una cuenta?{" "}
                            <Button asChild variant="link" className="h-auto p-0 text-sm font-medium">
                                <Link to="/register">Crear cuenta</Link>
                            </Button>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
