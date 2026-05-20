import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"

const success_route = '/admin/algo';

export const Login = () => {
    const [userForm, setUserForm] = useState({name: "", password: ""})
    const {user, login} = useAuthContext();

    const navigate = useNavigate();

    if(user) {
        return <Navigate to={success_route} replace />
    }

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUserForm({ ...userForm, [name]: value});
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        const success = login(userForm.name, userForm.password);
        if(success) {
            navigate(success_route);
        } else {
            alert("Credenciales incorrectas");
            setUserForm({name: "", password: ""});
        }
    }

    return (<form onSubmit={handleSubmit}>
        <h2>Iniciar Sesion</h2>
        <div>
            <label>Usuario:</label>
            <input type="text" name="name" value={userForm.name} onChange={handleChange} />

        </div>
        <div>
            <label>Contraseña:</label>
            <input type="password" name="password" value={userForm.password} onChange={handleChange} />
        </div>
        <button type="submit">Iniciar Sesion</button>
        </form>
    )

}