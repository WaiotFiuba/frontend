import { useState, type ChangeEvent, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"

type RegisterForm = {
    name: string
    email: string
    password: string
    confirmPassword: string
}

export default function Register() {
    const [form, setForm] = useState<RegisterForm>({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    })

    const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value)
    const passwordsMatch = form.password === form.confirmPassword
    const canSubmit =
        form.name.trim().length >= 3 &&
        isValidEmail(form.email.trim()) &&
        form.password.trim().length >= 6 &&
        passwordsMatch

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setForm((currentForm) => ({ ...currentForm, [name]: value }))
    }

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl font-bold">Crear cuenta</CardTitle>
                    <CardDescription>Completa tus datos para registrarte</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">
                                Usuario
                            </label>
                            <Input
                                id="name"
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Elegí un usuario"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email
                            </label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="Ingresa tu email"
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
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Crea una contraseña"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-medium">
                                Confirmar contraseña
                            </label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                name="confirmPassword"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                placeholder="Repite tu contraseña"
                            />
                        </div>
                        <div className="min-h-5">
                            {!passwordsMatch && form.confirmPassword.length > 0 && (
                                <p className="text-sm text-destructive">Las contraseñas no coinciden.</p>
                            )}
                        </div>
                        <Button type="submit" className="w-full" disabled={!canSubmit}>
                            Registrarse
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                            ¿Ya tienes una cuenta?{" "}
                            <Button asChild variant="link" className="h-auto p-0 text-sm font-medium">
                                <Link to="/login">Volver a iniciar sesión</Link>
                            </Button>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}