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
- **Gráficos**: Chart.js para dashboard interactivo.
- **Librerías**:
  - `xlsx` para exportación a Excel.
  - `jspdf` & `jspdf-autotable` para reportes PDF.
  - `html2canvas` para captura de dashboard.
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

## ☁️ Despliegue en Ubuntu (VPS/Servidor)

### Requisitos Previos
- Ubuntu 20.04 o superior
- Nginx instalado
- Node.js 18+ (opcional, solo si usas build)

### Método 1: Usando Build Estático (Recomendado)

1. **Compila el proyecto:**
   ```bash
   npm install
   npm run build
   ```

2. **Copia los archivos al servidor:**
   ```bash
   # Opción A: Si estás en el servidor
   sudo cp -r dist/* /var/www/inventario/
   
   # Opción B: Desde tu máquina local
   scp -r dist/* usuario@tu-servidor:/var/www/inventario/
   ```

3. **Configura Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/inventario
   ```
   
   Agrega esta configuración:
   ```nginx
   server {
       listen 80;
       server_name inventario.tudominio.com;
       root /var/www/inventario;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Opcional: Cacheo de archivos estáticos
       location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

4. **Activa el sitio:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/inventario /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. **Configura SSL (opcional con Let's Encrypt):**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d inventario.tudominio.com
   ```

### Método 2: Usando Vite Dev Server (Desarrollo)

Si quieres ejecutar el servidor de desarrollo:

1. **Instala Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

2. **Ejecuta el servidor:**
   ```bash
   npm install
   npm run dev -- --host
   ```

3. **Para producción con PM2:**
   ```bash
   sudo npm install -g pm2
   pm2 start npm --name "inventario" -- run dev -- --host
   pm2 save
   sudo pm2 startup
   ```

### Método 3: Docker (Opcional)

Crea un `Dockerfile`:
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build y ejecuta:
```bash
docker build -t inventario-servyre .
docker run -d -p 80:80 inventario-servyre
```

---

## 🔧 Configuración Adicional

- **Puerto por defecto:** 5173 (dev) / 80 (producción)
- **Theme:** Soporta modo claro/oscuro (toggle en la UI)

---
Desarrollado con ❤️ para Servyre.
