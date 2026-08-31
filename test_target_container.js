// Frontend test script to monitor ANY target container from 0% in real time
const API_URL = 'http://localhost:8000';

async function main() {
  // Obtener ID del contenedor por parámetro CLI (por defecto 26263)
  const targetId = process.argv[2] ? parseInt(process.argv[2], 10) : 26263;
  if (isNaN(targetId)) {
    console.error('❌ Error: El ID del contenedor debe ser un número entero válido.');
    console.log('Ejemplo de uso: npm run test:container -- 26263');
    process.exit(1);
  }

  console.log(` [FRONTEND TEST] Iniciando prueba de telemetría en vivo para Contenedor #${targetId}...`);

  // 1. Auth Login (mismo flujo que AuthContext.tsx)
  console.log('\n 1. Autenticando desde el frontend (prueba@gmail.com)...');
  let token = null;
  try {
    const params = new URLSearchParams({
      username: 'prueba@gmail.com',
      password: 'prueba123456'
    });
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = await loginRes.json();
    token = data.access_token;
    console.log('✅ Token JWT obtenido correctamente.');
  } catch (err) {
    console.error('❌ Error de autenticación:', err);
    process.exit(1);
  }

  // 2. Obtener metadatos y coordenadas del contenedor objetivo
  console.log(`\n 2. Obteniendo ubicación geográfica del contenedor #${targetId}...`);
  let targetMeta = null;
  try {
    const metaRes = await fetch(`${API_URL}/map/containers/${targetId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!metaRes.ok) {
      console.error(`❌ Contenedor #${targetId} no encontrado en la base de datos (HTTP ${metaRes.status}).`);
      process.exit(1);
    }
    targetMeta = await metaRes.json();
    console.log(`✅ Contenedor #${targetId} ubicado: ${targetMeta.site_name || 'Sin sitio'} | Lat: ${targetMeta.latitude}, Lng: ${targetMeta.longitude}`);
  } catch (err) {
    console.error('❌ Error al consultar contenedor:', err);
    process.exit(1);
  }

  const lat = targetMeta.latitude;
  const lng = targetMeta.longitude;
  const bboxUrl = `${API_URL}/map/containers/bbox?lat_min=${(lat - 0.002).toFixed(6)}&lat_max=${(lat + 0.002).toFixed(6)}&lng_min=${(lng - 0.002).toFixed(6)}&lng_max=${(lng + 0.002).toFixed(6)}&zoom=18&limit=50`;

  // 3. Detener simulación previa si existiera
  console.log('\n 3. Deteniendo cualquier simulación previa...');
  try {
    await fetch(`${API_URL}/digital-twin/simulations/active/status?action=stop`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  } catch (e) { }

  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 800));
    try {
      const activeRes = await fetch(`${API_URL}/digital-twin/simulations/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (activeRes.status === 404 || activeRes.status === 401) break;
      const data = await activeRes.json();
      if (!data || !data.status || ['completed', 'failed', 'stopped'].includes(data.status)) break;
    } catch (e) {
      break;
    }
  }

  await new Promise(r => setTimeout(r, 1000));

  // 4. Crear nueva simulación limpia
  console.log('\n 4. Creando nueva simulación limpia (Speedup: 180, Demanda: 10.0, Frecuencia: 15 min)...');
  const simRes = await fetch(`${API_URL}/digital-twin/simulations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      scenario: { name: `test_front_${targetId}`, frequency_minutes: 15, periods: 96 },
      speedup: 180,
      global_demand_multiplier: 10.0,
      transition_minutes: 60,
      zone_overrides: []
    })
  });
  const activeSim = await simRes.json();
  console.log(`✅ Simulación creada ID: ${activeSim.id} | Estado inicial: ${activeSim.status}`);

  // 5. Monitorear Contenedor en el viewport del mapa
  console.log(`\n 5. Monitoreando en vivo Contenedor #${targetId} en el mapa...`);
  console.log('========================================================================================================');

  let prevLevel = null;

  for (let tick = 1; tick <= 10; tick++) {
    await new Promise(r => setTimeout(r, 5000));

    // Consultar estado de simulación
    const simStatusRes = await fetch(`${API_URL}/digital-twin/simulations/active`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const simStatus = await simStatusRes.json();

    // Consultar contenedores en el viewport del mapa
    const bboxRes = await fetch(bboxUrl);
    const containers = await bboxRes.json();

    const target = Array.isArray(containers) ? containers.find(c => c.id === targetId || String(c.id) === String(targetId)) : null;

    if (target) {
      const currentLevel = target.current_level;
      const desc = target.site_name || targetMeta.site_name || `Contenedor #${targetId}`;
      const lastReading = target.last_reading ? new Date(target.last_reading).toLocaleTimeString() : 'N/A';
      const wasteType = target.container_type?.name || targetMeta.container_type?.name || 'RSU';

      if (prevLevel !== null && currentLevel > prevLevel) {
        console.log(` [TELEMETRÍA FRONT] Tick #${tick} | Período: ${simStatus.current_period}/96 | Contenedor #${targetId} (${desc}) [Tipo: ${wasteType}] ➔ 📈 ¡NIVEL SUBIÓ DE ${prevLevel}% A ${currentLevel}%! (Lectura: ${lastReading})`);
      } else {
        console.log(` [TELEMETRÍA FRONT] Tick #${tick} | Período: ${simStatus.current_period}/96 | Contenedor #${targetId} (${desc}) [Tipo: ${wasteType}] ➔ Nivel: ${currentLevel}% | Mediciones globales: ${simStatus.measurements_sent}`);
      }
      prevLevel = currentLevel;
    } else {
      console.log(`Tick #${tick} | Esperando datos de contenedor #${targetId}...`);
    }
  }

  console.log('========================================================================================================');
  console.log(`🎉 [FRONTEND TEST] Prueba para Contenedor #${targetId} completada con éxito.`);
}

main().catch(console.error);
