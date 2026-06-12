# Frontend - Waiot

React + TypeScript + Vite project for container monitoring and digital twin control.

---

## 🚀 Requisitos y Configuración Local

### Requisitos
- Node 24+
- npm (o pnpm)

### Configuración
1. Clonar el repositorio y configurar variables de entorno:
   ```bash
   cp .env.example .env
   # Edita el archivo .env con el URL de tu API backend
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Servidor de desarrollo (hot-reload):
   ```bash
   npm run dev
   ```
4. Compilar para producción:
   ```bash
   npm run build
   ```

---

## 📡 Integración de Endpoints del Backend

A continuación se detalla la comunicación entre el frontend y el backend, explicando en qué archivos se realiza cada llamada, qué parámetros se envían y el motivo de su integración.

### 1. Autenticación (Authentication)

* **`POST /auth/token`**
  * **Dónde se llama**: `frontend/src/context/AuthContext.tsx` y `frontend/src/pages/Login/Login.tsx`.
  * **Por qué**: Para autenticar al usuario y recibir el token JWT (`access_token`) y su tipo (`token_type`), guardándolos localmente en `localStorage` para autorizar las solicitudes posteriores.
* **`POST /auth/register`**
  * **Dónde se llama**: `frontend/src/pages/Register/page.tsx`.
  * **Por qué**: Permite registrar nuevos usuarios dentro del sistema.

---

### 2. Gestión de Contenedores (Container Management)

* **`GET /map/containers/?limit=1000&t={timestamp}`**
  * **Dónde se llama**:
    1. [Management/page.tsx](file:///c:/Users/isaia/Documents/Mis_archivos/Programacion/Proyectos/Waiot/frontend/src/pages/Management/page.tsx) (`loadContainers`) - Tabla de gestión administrativa.
    2. [InteractiveMap/utils/functions.tsx](file:///c:/Users/isaia/Documents/Mis_archivos/Programacion/Proyectos/Waiot/frontend/src/components/InteractiveMap/utils/functions.tsx) (`fetchContainers`) - Marcadores del mapa.
  * **Por qué**: Obtiene la lista completa de contenedores de basura, sus posiciones (latitud/longitud), tipos de residuos y porcentaje de nivel de llenado. Se incluye un parámetro de marca de tiempo `t` para forzar al navegador a saltear la caché local (HTTP cache) y asegurar datos frescos reposicionados por el gemelo digital.
* **`POST /map/containers/`**
  * **Dónde se llama**: `frontend/src/pages/Management/components/AddContainerForm.tsx`.
  * **Por qué**: Registra un nuevo contenedor especificando sus datos de coordenadas y tipo.
* **`DELETE /map/containers/{container_id}`**
  * **Dónde se llama**: `frontend/src/pages/Management/components/DeleteContainerForm.tsx`.
  * **Por qué**: Envía la solicitud para remover un contenedor específico por su ID.

---

### 3. Simulación de Gemelo Digital (Digital Twin Control)

* **`GET /digital-twin/demand/zones`**
  * **Dónde se llama**: [SimulationControl.tsx](file:///c:/Users/isaia/Documents/Mis_archivos/Programacion/Proyectos/Waiot/frontend/src/pages/Management/components/SimulationControl.tsx) (`fetchNeighborhoods`).
  * **Por qué**: Obtiene la lista dinámica de barrios registrados en la base de datos para rellenar los selectores (dropdowns) de multiplicadores específicos por zona.
* **`POST /digital-twin/simulations`**
  * **Dónde se llama**: [SimulationControl.tsx](file:///c:/Users/isaia/Documents/Mis_archivos/Programacion/Proyectos/Waiot/frontend/src/pages/Management/components/SimulationControl.tsx) (`handleStartSimulation`).
  * **Por qué**: Configura e inicia una nueva simulación enviando parámetros como velocidad (`speedup`), multiplicador global de demanda, minutos de transición y overrides específicos por barrio. Se inicializa en estado `"paused"` en el backend por defecto.
* **`GET /digital-twin/simulations/active?t={timestamp}`**
  * **Dónde se llama**:
    1. [SimulationControl.tsx](file:///c:/Users/isaia/Documents/Mis_archivos/Programacion/Proyectos/Waiot/frontend/src/pages/Management/components/SimulationControl.tsx) (`fetchActiveSimulation`) - Modo monitor y control en vivo.
    2. [Containers/page.tsx](file:///c:/Users/isaia/Documents/Mis_archivos/Programacion/Proyectos/Waiot/frontend/src/pages/Containers/page.tsx) (`fetchActiveSimulation`) - Panel superior del mapa interactivo.
  * **Por qué**: Consulta si hay una sesión activa corriendo o en pausa en el servidor. El frontend utiliza el parámetro de velocidad de la simulación activa para recalcular dinámicamente la frecuencia de polling (cada cuánto tiempo consulta actualizaciones al backend).
* **`POST /digital-twin/simulations/active/resume`**
  * **Dónde se llama**: [SimulationControl.tsx](file:///c:/Users/isaia/Documents/Mis_archivos/Programacion/Proyectos/Waiot/frontend/src/pages/Management/components/SimulationControl.tsx) y [Containers/page.tsx](file:///c:/Users/isaia/Documents/Mis_archivos/Programacion/Proyectos/Waiot/frontend/src/pages/Containers/page.tsx) (`handlePlayResume`).
  * **Por qué**: Reanuda una simulación que está en estado pausado (`paused`) o recién creada (`pending`) para cambiar su estado a corriendo (`running`).
* **`POST /digital-twin/simulations/active/pause`**
  * **Dónde se llama**: [SimulationControl.tsx](file:///c:/Users/isaia/Documents/Mis_archivos/Programacion/Proyectos/Waiot/frontend/src/pages/Management/components/SimulationControl.tsx) y [Containers/page.tsx](file:///c:/Users/isaia/Documents/Mis_archivos/Programacion/Proyectos/Waiot/frontend/src/pages/Containers/page.tsx) (`handlePause`).
  * **Por qué**: Pausa temporalmente el avance del reloj de la simulación en el backend sin destruir la sesión activa.
* **`POST /digital-twin/simulations/active/stop`**
  * **Dónde se llama**: [SimulationControl.tsx](file:///c:/Users/isaia/Documents/Mis_archivos/Programacion/Proyectos/Waiot/frontend/src/pages/Management/components/SimulationControl.tsx) y [Containers/page.tsx](file:///c:/Users/isaia/Documents/Mis_archivos/Programacion/Proyectos/Waiot/frontend/src/pages/Containers/page.tsx) (`handleStop`).
  * **Por qué**: Finaliza permanentemente la sesión de simulación actual en el backend (limpia el estado activo).
* **`PATCH /digital-twin/simulations/active/controls`**
  * **Dónde se llama**: [SimulationControl.tsx](file:///c:/Users/isaia/Documents/Mis_archivos/Programacion/Proyectos/Waiot/frontend/src/pages/Management/components/SimulationControl.tsx) (`submitLiveControls`).
  * **Por qué**: Permite modificar en vivo la velocidad, multiplicador global de demanda y multiplicadores específicos por barrio de la simulación activa, sin pausar o detener su ciclo actual.