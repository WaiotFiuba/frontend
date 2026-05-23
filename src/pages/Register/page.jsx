import { Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"

export default function Register() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl font-bold">Crear cuenta</CardTitle>
                    <CardDescription>Completa tus datos para registrarte</CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">
                                Usuario
                            </label>
                            <Input id="name" type="text" name="name" placeholder="Elegí un usuario" />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Email
                            </label>
                            <Input id="email" type="email" name="email" placeholder="Ingresa tu email" />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                Contraseña
                            </label>
                            <Input id="password" type="password" name="password" placeholder="Crea una contraseña" />
                        </div>
                        <Button type="submit" className="w-full">
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