# Inventario IT Servyre 🚀

Aplicación web premium para la gestión de activos tecnológicos de Servyre. Desarrollada con un enfoque en diseño moderno (Glassmorphism), usabilidad y eficiencia.

## ✨ Características

- **CRUD Completo**: Gestión de equipos con todos los campos relevantes (Nombre, Correo, Modelo, Serie, RAM, Disco, etc.)
- **Dashboard Interactivo**: 
  - KPIs visuales con contadores animados
  - Gráficos de estado y ubicación
  - Alertas flotantes para cambios de estado
  - Tabla de inventario integrada
- **Exportación Profesional**:
  - 📊 Descarga en formato **Excel** (.xlsx)
  - 📄 Generación de reportes en **PDF** con tabla auto-ajustable
  - 💾 Exportar/Importar JSON para respaldo
- **Búsqueda Inteligente**: Filtrado instantáneo por cualquier campo del inventario
- **Gestión de Catálogos**: Configuración de marcas, modelos y ubicaciones
- **Persistencia Local**: Datos cifrados y guardados automáticamente en LocalStorage
- **Diseño Premium**: Interfaz Glassmorphism con soporte para temas claro/oscuro
- **Sistema de Alertas**: Notificaciones flotantes para cambios de estado de equipos
- **Ordenamiento de Tablas**: Ordenar por columnas con indicadores visuales
- **Importación Excel**: Carga masiva de registros desde Excel

## 🛠️ Tecnologías

- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Bundler**: Vite
- **Gráficos**: Chart.js para dashboard interactivo
- **Librerías**:
  - `xlsx` - Exportación Excel
  - `jspdf` & `jspdf-autotable` - Reportes PDF
  - `html2canvas` - Captura de dashboard
  - `lucide-icons` - Iconos SVG
  - `crypto-js` - Cifrado de datos
  - `gridstack` - Widgets arrastrables

## 🚀 Instalación y Uso Local

1. Asegúrate de tener [Node.js](https://nodejs.org/) instalado
2. Abre una terminal en la carpeta del proyecto
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Abre el navegador en `http://localhost:5173`

## 📋 Historial de Cambios

### v2.0 (Actual)
- ✅ Ordenamiento por columnas en tabla de inventario con indicadores visuales
- ✅ Sistema de alertas descartables individualmente con reaparición automática
- ✅ Dashboard con tabla compacta de ubicaciones y lista jerárquica de modelos
- ✅ Tarjetas visuales CSS en lugar de gráficos Chart.js
- ✅ Tabla de inventario responsive con scroll horizontal
- ✅ Alertas flotantes para cambios de estado de equipos
- ✅ Descripción en tarjetas de ubicación y modelos
- ✅ Historial de usuarios y campos IP en ejemplos
- ✅ Reordenamiento de toolbar
- ✅ Exportación JSON/CSV
- ✅ Importación desde Excel con plantilla predefinida
- ✅ Mejoras en renderizado de iconos Lucide
- ✅ Scroll horizontal en tablas

### v1.0
- ✅ CRUD completo de activos IT
- ✅ Dashboard con KPIs y gráficos
- ✅ Búsqueda y filtrado
- ✅ Exportación Excel y PDF
- ✅ Persistencia local con cifrado
- ✅ Catálogos configurables (marcas, modelos, ubicaciones)
- ✅ Tema claro/oscuro
- ✅ Diseño Glassmorphism

## 📂 Estructura del Proyecto

```
inventario-servyre/
├── index.html              # Página principal
├── package.json           # Dependencias
├── src/
│   ├── main.js           # Lógica principal
│   ├── config.js         # Configuración
│   ├── style.css         # Estilos globales
│   ├── modules/
│   │   ├── ui.js         # Elementos del DOM
│   │   ├── utils.js      # Utilidades
│   │   ├── state.js      # Estado global
│   │   ├── storage.js    # Persistencia
│   │   ├── catalog.js    # Catálogos
│   │   ├── dashboard.js  # Dashboard básico
│   │   ├── dashboard-premium.js  # Dashboard avanzado
│   │   ├── export.js     # Exportación
│   │   └── logo-manager.js      # Gestión de logos
│   └── css/
│       ├── dashboard.css
│       ├── dashboard-premium.css
│       ├── animations.css
│       └── logo-manager.css
└── dist/                 # Build de producción
```

## ☁️ Despliegue en Servidor

### Método 1: Build Estático (Recomendado)

1. **Compila el proyecto:**
   ```bash
   npm install
   npm run build
   ```

2. **Copia los archivos al servidor:**
   ```bash
   sudo cp -r dist/* /var/www/inventario/
   ```

3. **Configura Nginx:**
   ```nginx
   server {
       listen 80;
       server_name inventario.tudominio.com;
       root /var/www/inventario;
       index index.html;
       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

### Método 2: Docker
```bash
docker build -t inventario-servyre .
docker run -d -p 80:80 inventario-servyre
```

## 🔧 Configuración

- **Puerto dev:** 5173
- **Theme:** Modo claro/oscuro (toggle en la UI)
- **Cifrado:** AES con clave configurable en `src/config.js`

---

Desarrollado con ❤️ para Servyre IT
