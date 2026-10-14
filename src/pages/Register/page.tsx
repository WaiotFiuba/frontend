import { useState, type ChangeEvent, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuthContext } from "../../context/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/utils/ui/card"
import { Button } from "@/utils/ui/button"
import { Input } from "@/utils/ui/input"

type RegisterForm = {
    name: string
    email: string
    password: string
    confirmPassword: string
}

type RegisterPayload = {
    name: string
    email: string
    password: string
    role_id: number
}

export default function Register() {
    const { t } = useTranslation()
    const [form, setForm] = useState<RegisterForm>({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()
    const { register } = useAuthContext()

    const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value)
    const passwordsMatch = form.password === form.confirmPassword
    const nameError = form.name.trim().length === 0 && form.name.length > 0
    const emailError = form.email.length > 0 && !isValidEmail(form.email.trim())
    const passwordByteLength = new TextEncoder().encode(form.password).length
    const passwordError = form.password.length > 0 && (passwordByteLength < 8 || passwordByteLength > 72)
    const confirmPasswordError = form.confirmPassword.length > 0 && !passwordsMatch
    const canSubmit =
        form.name.trim().length > 0 &&
        isValidEmail(form.email.trim()) &&
        passwordByteLength >= 8 &&
        passwordByteLength <= 72 &&
        passwordsMatch

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setForm((currentForm) => ({ ...currentForm, [name]: value }))
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!canSubmit) {
            return
        }

        setLoading(true)
        setError(null)

        const payload: RegisterPayload = {
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role_id: 2,
        }

        try {
            const ok = await register({ name: payload.name, email: payload.email, password: payload.password })
            if (!ok) {
                throw new Error('No se pudo registrar al usuario.')
            }

            navigate('/login')
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'No se pudo registrar al usuario.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-2xl font-bold">{t('auth.register_title')}</CardTitle>
                    <CardDescription>{t('auth.register_subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-2">
                        {error && (
                            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">
                                {t('auth.name')}
                            </label>
                            <Input
                                id="name"
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder={t('auth.name_placeholder')}
                                disabled={loading}
                            />
                            {nameError && <p className="text-sm text-destructive">{t('auth.name_required')}</p>}
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                {t('auth.email')}
                            </label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder={t('auth.email_placeholder')}
                                disabled={loading}
                            />
                            <p
                                aria-live="polite"
                                className={`overflow-hidden text-sm text-destructive transition-all duration-200 ease-out ${emailError ? "max-h-5 opacity-100 mt-1" : "max-h-0 opacity-0"
                                    }`}
                            >
                                {t('auth.invalid_email')}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                {t('auth.password')}
                            </label>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder={t('auth.password_placeholder')}
                                disabled={loading}
                            />
                            <p
                                aria-live="polite"
                                className={`overflow-hidden text-sm text-destructive transition-all duration-200 ease-out ${passwordError ? "max-h-5 opacity-100 mt-1" : "max-h-0 opacity-0"
                                    }`}
                            >
                                {t('auth.password_length')}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="confirmPassword" className="text-sm font-medium">
                                {t('auth.confirm_password')}
                            </label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                name="confirmPassword"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                placeholder={t('auth.confirm_password_placeholder')}
                                disabled={loading}
                            />
                            <div className="min-h-5">
                                {confirmPasswordError && (
                                    <p className="text-sm text-destructive">{t('auth.password_mismatch')}</p>
                                )}
                            </div>
                        </div>
                        <Button type="submit" className="w-full cursor-pointer" disabled={!canSubmit || loading}>
                            {loading ? t('auth.registering') : t('auth.register_submit')}
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                            {t('auth.have_account')}{" "}
                            <Button asChild variant="link" className="h-auto p-0 text-sm font-medium cursor-pointer">
                                <Link to="/login">{t('auth.sign_in_link')}</Link>
                            </Button>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}