# Inventario IT Servyre 🚀

Aplicación web premium para la gestión de activos tecnológicos de Servyre. Desarrollada con un enfoque en diseño moderno (Glassmorphism), usabilidad y eficiencia.

## ✨ Características

- **CRUD Completo**: Gestión de equipos (Nombre, Correo, Modelo, Serie, RAM, Disco, etc.).
- **Exportación Profesional**:
  - 📊 Descarga en formato **Excel** (.xlsx) con un clic.
  - 📄 Generación de reportes en **PDF** con tabla auto-ajustable.
- **Búsqueda Inteligente**: Filtrado instantáneo por cualquier campo del inventario.
- **Persistencia Local**: Los datos se guardan automáticamente en el navegador (LocalStorage).
- **Diseño Premium**: Interfaz oscura elegante con soporte para iconos de Lucide y fuentes modernas.

## 🛠️ Tecnologías

- **Core**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Bundler**: Vite.
- **Librerías**:
  - `xlsx` para exportación a Excel.
  - `jspdf` & `jspdf-autotable` para reportes PDF.
  - `lucide-icons` para una estética visual superior.

## 🚀 Instalación y Uso Local

1. Asegúrate de tener [Node.js](https://nodejs.org/) instalado.
2. Abre una terminal en la carpeta del proyecto.
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Abre el navegador en `http://localhost:5173`.

## 📂 Cómo subir a GitHub

Para subir este proyecto a tu cuenta de GitHub, sigue estos pasos:

1. **Crea un repositorio nuevo** en GitHub (no incluyas README ni .gitignore).
2. Abre la terminal en esta carpeta y ejecuta:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Inventario IT Servyre"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```

---
Desarrollado con ❤️ para Servyre.
