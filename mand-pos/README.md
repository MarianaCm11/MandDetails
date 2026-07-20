# MAND — Sistema de Inventario y Punto de Venta Offline-First

**MAND** es un sistema de gestión de inventario y punto de venta diseñado específicamente para negocios de ropa y accesorios (pulseras, aretes, collares, pinzas, ropa de mujer y hombre). Está construido con tecnología moderna y funciona sin conexión a internet, sincronizando automáticamente los datos a la nube cuando detecta Wi-Fi disponible.

---

## ¿Qué hace este sistema?

### 📦 Gestión de Productos
Permite registrar cada producto del inventario con información detallada:
- **Nombre, categoría y marca** del artículo.
- **Material** (con menú desplegable para opciones comunes como acero inoxidable, aleación de zinc, plata 925, etc.).
- **Detalles de diseño** (formas, texturas, colores).
- **Etiquetas de estilo** (gótico, casual, fresa, elegante, etc.) que funcionan como sistema de filtrado rápido.
- **Estado del producto**: disponible, pedido pendiente, apartado por cliente o en deuda.
- **Campos especiales para ropa**: tallas de fábrica, tallas que llegaron físicamente al stock, y un indicador booleano para marcar si es diseño Curvi (Plus Size).

### 💰 Historial de Compras por Lotes
Como los proveedores manejan descuentos variables, un mismo producto puede comprarse varias veces con costos diferentes. El sistema registra cada compra como un **Lote** independiente que incluye:
- **Costo exacto** pagado por esa compra específica.
- **Precio original** marcado por el proveedor (antes de descuentos).
- **Cantidad pedida vs. cantidad recibida**, para identificar faltantes y controlar si aplica reembolso.

### 📊 Cálculo Automático de Precios y Ganancias
- Se registra el **precio de venta individual** y un **precio de promoción** opcional.
- El sistema calcula en tiempo real: la **ganancia unitaria**, el **margen de ganancia porcentual** y la **ganancia total proyectada** por lote.
- En la vista de Inventario se muestran **estadísticas en vivo**: total de productos, piezas en stock y el valor monetario total del inventario actual.

### 🔍 Búsqueda y Filtros Avanzados
El módulo de Inventario incluye un sistema de filtros que permite localizar productos rápidamente por:
- Nombre o marca (búsqueda de texto libre).
- Categoría (Pulseras, Aretes, Collares, Ropa, etc.).
- Material.
- Etiquetas de estilo.

Se incluyen alertas visuales para productos con bajo stock (3 piezas o menos).

### 📥📤 Importar y Exportar por Excel
Para quienes manejan su inventario con hojas de cálculo, el sistema permite:
- **Exportar** todo el inventario actual de la nube a un archivo Excel (.xlsx) descargable.
- **Importar** productos masivamente desde un archivo Excel existente, con barra de progreso que muestra fila por fila cuántos productos se han guardado.

### 🌐 Funcionamiento Offline-First
La base de datos utiliza **Firebase Firestore** con persistencia local habilitada. Esto significa que:
- Si **hay conexión a internet**, los datos se guardan en la nube de Firebase y se sincronizan en todos los dispositivos.
- Si **no hay conexión**, los datos se almacenan automáticamente en el navegador (IndexedDB) y se sincronizan a la nube cuando el Wi-Fi vuelve a estar disponible.
- Un indicador visual en la barra superior muestra en todo momento si el sistema está **"En línea"** (verde) o **"Guardando local"** (naranja), para que el usuario siempre sepa el estado de su información.

### 🎨 Interfaz de Usuario
La aplicación cuenta con un diseño moderno tipo dark mode con efectos de cristal (glassmorphism), micro-animaciones y una paleta de colores curada en tonos púrpura y magenta. Incluye:
- Barra lateral de navegación con acceso rápido a todos los módulos.
- Formularios con menús desplegables para agilizar la captura y evitar errores tipográficos.
- Tabla de inventario con vista detallada por producto.
- Modal de detalle para consultar toda la información de un artículo.

---

## Módulos del Sistema

| Módulo | Estado | Descripción |
|---|---|---|
| Captura de Productos | ✅ Completado | Formulario inteligente para registrar productos con lotes, precios y cálculo de ganancias |
| Inventario | ✅ Completado | Tabla en tiempo real con filtros, estadísticas y modal de detalle |
| Configuración | ✅ Completado | Prueba de conexión a Firebase, importar/exportar Excel, datos de prueba |
| Dashboard | 🔜 Próximamente | Panel de estadísticas con productos más vendidos y alertas de bajo stock |
| Gestión de Kits | 🔜 Próximamente | Agrupación de productos con cálculo automático de costo y ganancia del conjunto |
| Punto de Venta | 🔜 Próximamente | Interfaz para registrar ventas y descontar stock automáticamente |

---

## Tecnologías Utilizadas

- **React 18** — Librería de interfaz de usuario.
- **Vite** — Herramienta de desarrollo ultrarrápida.
- **Firebase Firestore** — Base de datos NoSQL en la nube con soporte offline.
- **SheetJS (xlsx)** — Lectura y escritura de archivos Excel sin costo.
- **Lucide React** — Iconografía moderna y consistente.
- **React Hook Form** — Manejo eficiente de formularios.
- **Vanilla CSS** — Estilos personalizados con variables CSS, glassmorphism y animaciones.

---

## Cómo Ejecutar

```bash
cd mand-pos
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173/`.

> **Nota:** Antes de usar el sistema, se deben configurar las credenciales de Firebase en el archivo `src/firebase.js`.
