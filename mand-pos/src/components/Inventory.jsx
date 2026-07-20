import { useState, useRef, useEffect } from 'react';
import { deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Filter, Eye, Package, RefreshCw, Box, Settings, Edit, ArrowUp } from 'lucide-react';
import useFirestoreCollection from '../hooks/useFirestoreCollection';
import ConfirmModal from './ui/ConfirmModal';
import PurchaseHistory from './PurchaseHistory';
import CategoriesManager from './CategoriesManager';
import ProductCapture from './ProductCapture';
import './Inventory.css';

export default function Inventory() {
  const { data: products, loading: prodsLoading } = useFirestoreCollection('products');
  const { data: categories } = useFirestoreCollection('categories', 'name');
  const { data: materials } = useFirestoreCollection('materials', 'name');

  const [mainTab, setMainTab] = useState('inventory'); // 'inventory' | 'admin'

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [filterMaterial, setFilterMaterial] = useState('Todos');
  const [filterTag, setFilterTag] = useState('Todas');
  const [filterPurpose, setFilterPurpose] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [manageProduct, setManageProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  const topRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Detectar si el usuario ha hecho scroll
  useEffect(() => {
    const container = document.querySelector('.main-content') || window;
    const handleScroll = () => {
      const scrollY = container === window ? window.scrollY : container.scrollTop;
      setShowScrollTop(scrollY > 300);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
    const container = document.querySelector('.main-content') || window;
    if (container === window) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openModal = (setter, value) => {
    setter(value);
    scrollToTop();
  };

  const handleDelete = async (id) => {
    try {
      await updateDoc(doc(db, 'products', id), { isDeleted: true });
      setManageProduct(null);
    } catch (err) {
      console.error("Error al marcar como eliminado:", err);
      alert("Error al marcar producto como eliminado.");
    }
  };

  const handleDiscountStock = async (id, amount) => {
    try {
      const p = products.find(prod => prod.id === id);
      if (p) {
        const newStock = Math.max(0, (p.stock || 0) - amount);
        const newStatus = newStock === 0 ? 'agotado' : p.status;
        
        // Calcular ganancia generada
        const salePrice = p.pricing?.baseSalePrice || 0;
        const earningsGenerated = amount * salePrice;

        // Sumar a las ganancias globales
        const finRef = doc(db, 'finances', 'earnings');
        const finSnap = await getDoc(finRef);
        const currentEarnings = finSnap.exists() ? (finSnap.data().totalEarned || 0) : 0;
        await setDoc(finRef, { totalEarned: currentEarnings + earningsGenerated }, { merge: true });

        // Actualizar producto
        await updateDoc(doc(db, 'products', id), { 
          stock: newStock,
          status: newStatus
        });
      }
      setManageProduct(null);
    } catch (error) {
      console.error("Error descontando stock:", error);
      alert("Error al descontar stock.");
    }
  };

  const handleEditStock = async (id, newStockAmount) => {
    try {
      const p = products.find(prod => prod.id === id);
      if (p) {
        const newStatus = newStockAmount === 0 ? 'agotado' : p.status;
        await updateDoc(doc(db, 'products', id), { 
          stock: newStockAmount,
          status: newStatus
        });
      }
      setManageProduct(null);
    } catch (error) {
      console.error("Error editando stock:", error);
      alert("Error al editar stock.");
    }
  };

  // Materiales únicos (deduplicados y filtrados por categoría)
  const activeProducts = products.filter(p => !p.isDeleted);
  const availableMaterials = filterCategory === 'Todas'
    ? materials.map(m => m.name)
    : materials.filter(m => m.categoryId === filterCategory).map(m => m.name);
  const uniqueMaterials = [...new Set(availableMaterials)];

  // Etiquetas únicas (dependientes de la categoría seleccionada)
  const productsForTags = filterCategory === 'Todas' 
    ? activeProducts 
    : activeProducts.filter(p => {
        const pCatId = p.categoryId || '';
        const pCatName = p.categoryName || p.category || '';
        return pCatId === filterCategory || pCatName === filterCategory;
      });
  const allTags = productsForTags.flatMap(p => p.tags || []);
  const uniqueTags = [...new Set(allTags)].sort();

  // Filtrar productos
  const filtered = activeProducts.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.tags || []).some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const pCatId = p.categoryId || '';
    const pCatName = p.categoryName || p.category || '';
    const matchesCategory = filterCategory === 'Todas' || pCatId === filterCategory || pCatName === filterCategory;
    const matchesMaterial = filterMaterial === 'Todos' || p.material === filterMaterial;
    const matchesTag = filterTag === 'Todas' || (p.tags || []).includes(filterTag);
    const pPurpose = p.purpose || 'venta';
    const matchesPurpose = filterPurpose === 'Todos' || pPurpose === filterPurpose;
    const matchesStatus = filterStatus === 'Todos' || p.status === filterStatus;

    return matchesSearch && matchesCategory && matchesMaterial && matchesTag && matchesPurpose && matchesStatus;
  });

  // Estadísticas — solo para venta
  const forSale = filtered.filter(p => (p.purpose || 'venta') === 'venta');
  const totalStock = filtered.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalValue = forSale.reduce((sum, p) => sum + ((p.pricing?.baseSalePrice || 0) * (p.stock || 0)), 0);
  const lowStock = filtered.filter(p => (p.stock || 0) <= 3 && (p.stock || 0) > 0).length;
  const outOfStock = filtered.filter(p => (p.stock || 0) === 0).length;

  const getStatusBadge = (status) => {
    const map = {
      'disponible': { label: 'Disponible', cls: 'badge-success' },
      'pedido_pendiente': { label: 'Pedido', cls: 'badge-warning' },
      'apartado': { label: 'Apartado', cls: 'badge-info' },
      'deuda': { label: 'Deuda', cls: 'badge-error' },
      'solo_encargo': { label: 'Solo Encargo', cls: 'badge-purple' },
      'agotado': { label: 'Agotado', cls: 'badge-error' }
    };
    const s = map[status] || { label: status || 'N/A', cls: 'badge-info' };
    return <span className={`badge ${s.cls}`}>{s.label}</span>;
  };

  const getPurposeLabel = (purpose) => {
    const map = { 'venta': 'Venta', 'personal': 'Personal', 'regalo': 'Regalo' };
    return map[purpose] || 'Venta';
  };

  if (prodsLoading) {
    return (
      <div className="glass-panel card" style={{ textAlign: 'center', padding: '4rem' }}>
        <RefreshCw size={40} style={{ color: 'var(--accent-primary)', marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
        <h3>Cargando inventario...</h3>
      </div>
    );
  }

  return (
    <div className="inventory-view">
      {/* Ref invisible al inicio de la vista */}
      <div ref={topRef} />
      {/* Pestañas principales */}
      <div className="inv-main-tabs">
        <button className={`main-tab-btn ${mainTab === 'inventory' ? 'active' : ''}`} onClick={() => setMainTab('inventory')}>
          <Package size={18} /> Inventario
        </button>
        <button className={`main-tab-btn ${mainTab === 'admin' ? 'active' : ''}`} onClick={() => setMainTab('admin')}>
          <Settings size={18} /> Administrar Categorías
        </button>
      </div>

      {/* === PESTAÑA INVENTARIO === */}
      {mainTab === 'inventory' && (
        <>
          {/* Resumen rápido */}
          <div className="stats-bar">
            <div className="stat-card glass-panel">
              <Package size={20} />
              <div><span className="stat-number">{filtered.length}</span><span className="stat-desc">Productos</span></div>
            </div>
            <div className="stat-card glass-panel">
              <Package size={20} />
              <div><span className="stat-number">{totalStock}</span><span className="stat-desc">Piezas en Stock</span></div>
            </div>
            <div className="stat-card glass-panel">
              <Package size={20} />
              <div><span className="stat-number">${totalValue.toLocaleString('es-MX')}</span><span className="stat-desc">Valor en Venta</span></div>
            </div>
            {lowStock > 0 && (
              <div className="stat-card glass-panel" style={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}>
                <Package size={20} style={{ color: '#f59e0b' }} />
                <div><span className="stat-number" style={{ color: '#f59e0b' }}>{lowStock}</span><span className="stat-desc">Bajo Stock</span></div>
              </div>
            )}
            {outOfStock > 0 && (
              <div className="stat-card glass-panel" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                <Package size={20} style={{ color: '#ef4444' }} />
                <div><span className="stat-number" style={{ color: '#ef4444' }}>{outOfStock}</span><span className="stat-desc">Agotados</span></div>
              </div>
            )}
          </div>

          {/* Filtros */}
          <div className="filters-bar glass-panel">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por nombre, marca o etiqueta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <Filter size={16} />
              <select className="form-control" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="Todas">Todas las categorías</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <select className="form-control" value={filterMaterial} onChange={(e) => setFilterMaterial(e.target.value)}>
                <option value="Todos">Todos los materiales</option>
                {uniqueMaterials.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <select className="form-control" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
                <option value="Todas">Todas las etiquetas</option>
                {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <select className="form-control" value={filterPurpose} onChange={(e) => setFilterPurpose(e.target.value)}>
                <option value="Todos">Cualquier propósito</option>
                <option value="venta">Para Venta</option>
                <option value="personal">Uso Personal</option>
                <option value="regalo">Regalo</option>
              </select>
            </div>
            <div className="filter-group">
              <select className="form-control" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="Todos">Cualquier estado</option>
                <option value="disponible">Disponible</option>
                <option value="pedido_pendiente">Pedido Pendiente</option>
                <option value="apartado">Apartado</option>
                <option value="deuda">En Deuda</option>
                <option value="solo_encargo">Solo por encargo</option>
                <option value="agotado">Agotado</option>
              </select>
            </div>
          </div>

          {/* Tabla de productos */}
          {filtered.length === 0 ? (
            <div className="glass-panel card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <h3 style={{ marginBottom: '0.5rem' }}>Sin resultados</h3>
              <p style={{ color: 'var(--text-secondary)' }}>No se encontraron productos con esos filtros.</p>
            </div>
          ) : (
            <div className="table-container glass-panel">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Material</th>
                    <th>Propósito</th>
                    <th>Stock</th>
                    <th>Precio</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="animate-fade-in">
                      <td>
                        <div className="product-name">{p.name || 'Sin nombre'}</div>
                        {p.brand && <div className="product-brand">{p.brand}</div>}
                      </td>
                      <td><span className="category-pill">{p.categoryName || p.category || 'N/A'}</span></td>
                      <td>{p.material || '—'}</td>
                      <td>{getPurposeLabel(p.purpose || 'venta')}</td>
                      <td>
                        <span className={`stock-num ${(p.stock || 0) === 0 ? 'out-of-stock' : (p.stock || 0) <= 3 ? 'low-stock' : ''}`}>
                          {p.stock || 0}
                        </span>
                      </td>
                      <td className="price-col">${(p.pricing?.baseSalePrice || 0).toFixed(2)}</td>
                      <td>{getStatusBadge(p.status)}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="icon-btn" title="Ver detalles" onClick={() => openModal(setSelectedProduct, p)}>
                            <Eye size={16} />
                          </button>
                          <button className="icon-btn" title="Editar producto" onClick={() => openModal(setEditingProduct, p)}>
                            <Edit size={16} />
                          </button>
                          <button className="icon-btn" title="Administrar / Eliminar" onClick={() => setManageProduct(p)}>
                            <Box size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal de detalle */}
          {selectedProduct && (
            <div className="modal-overlay" onClick={() => setSelectedProduct(null)} style={{ zIndex: 100, alignItems: 'flex-start', paddingTop: '3vh' }}>
              <div className="modal-content glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '94%', maxHeight: '92vh', overflowY: 'auto' }}>
                {/* Header sticky */}
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-surface)', borderBottom: '1px solid rgba(139,92,246,0.15)', padding: '1rem 1.5rem', borderRadius: '12px 12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '1.2rem' }}>{selectedProduct.name}</h2>
                  <button className="btn btn-outline" style={{ padding: '0.3rem 0.9rem' }} onClick={() => setSelectedProduct(null)}>✕ Cerrar</button>
                </div>
                <div style={{ padding: '0 1.5rem 1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.95rem' }}>
                  <div><strong style={{color:'var(--text-secondary)'}}>Categoría:</strong> {selectedProduct.categoryName || selectedProduct.category}</div>
                  <div><strong style={{color:'var(--text-secondary)'}}>Material:</strong> {selectedProduct.material || '—'}</div>
                  <div><strong style={{color:'var(--text-secondary)'}}>Marca:</strong> {selectedProduct.brand || '—'}</div>
                  <div><strong style={{color:'var(--text-secondary)'}}>Estado:</strong> {selectedProduct.status}</div>
                  <div><strong style={{color:'var(--text-secondary)'}}>Propósito:</strong> {getPurposeLabel(selectedProduct.purpose || 'venta')}</div>
                  <div><strong style={{color:'var(--text-secondary)'}}>Stock:</strong> {selectedProduct.stock || 0} piezas</div>
                  <div><strong style={{color:'var(--text-secondary)'}}>Precio Original:</strong> ${(selectedProduct.pricing?.originalPrice || 0).toFixed(2)}</div>
                  <div><strong style={{color:'var(--text-secondary)'}}>Precio de Venta:</strong> ${(selectedProduct.pricing?.baseSalePrice || 0).toFixed(2)}</div>
                  {selectedProduct.pricing?.promoPrice > 0 && (
                    <div><strong style={{color:'var(--text-secondary)'}}>Precio Promo:</strong> ${selectedProduct.pricing.promoPrice.toFixed(2)}</div>
                  )}
                  {selectedProduct.details && (
                    <div style={{ gridColumn: '1 / -1' }}><strong style={{color:'var(--text-secondary)'}}>Detalles:</strong> {selectedProduct.details}</div>
                  )}

                  {/* Campos de Ropa */}
                  {selectedProduct.clothingDetails && (
                    <div style={{ gridColumn: '1 / -1', background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
                      <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>Detalles de Ropa</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                        {selectedProduct.clothingDetails.garmentType && <div><strong>Tipo:</strong> {selectedProduct.clothingDetails.garmentType}</div>}
                        {selectedProduct.clothingDetails.isCurvi !== undefined && <div><strong>Curvi:</strong> {selectedProduct.clothingDetails.isCurvi ? 'Sí' : 'No'}</div>}
                        {selectedProduct.clothingDetails.sizes && selectedProduct.clothingDetails.sizes.length > 0 ? (
                          <div>
                            <strong>Tallas:</strong>{' '}
                            {selectedProduct.clothingDetails.sizes.map((s, idx) => (
                              <span key={idx} className="badge badge-info" style={{ marginRight: '0.2rem' }}>{s}</span>
                            ))}
                          </div>
                        ) : (
                          selectedProduct.clothingDetails.sizesOrdered && <div><strong>Talla Pedida:</strong> {selectedProduct.clothingDetails.sizesOrdered}</div>
                        )}
                        {selectedProduct.clothingDetails.colors && <div><strong>Colores:</strong> {selectedProduct.clothingDetails.colors}</div>}
                        {selectedProduct.clothingDetails.stretch && <div><strong>Estiramiento:</strong> {selectedProduct.clothingDetails.stretch}</div>}
                        {selectedProduct.clothingDetails.transparent !== undefined && <div><strong>Transparencia:</strong> {selectedProduct.clothingDetails.transparent ? 'Sí' : 'No'}</div>}
                        {selectedProduct.clothingDetails.composition && selectedProduct.clothingDetails.composition.length > 0 && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <strong>Composición:</strong>{' '}
                            {selectedProduct.clothingDetails.composition.map((c, i) => `${c.material} ${c.percentage}%`).join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Custom Fields */}
                  {selectedProduct.customFieldValues && Object.keys(selectedProduct.customFieldValues).length > 0 && (
                    <div style={{ gridColumn: '1 / -1', background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
                      <h4 style={{ marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>Atributos Adicionales</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {Object.entries(selectedProduct.customFieldValues).map(([key, value]) => (
                          <div key={key}><strong>{key}:</strong> {value}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <strong style={{color:'var(--text-secondary)'}}>Etiquetas:</strong>{' '}
                      {selectedProduct.tags.map((t, i) => <span key={i} className="badge badge-info" style={{ marginRight: '0.4rem' }}>{t}</span>)}
                    </div>
                  )}
                  {selectedProduct.notes && (
                    <div style={{ gridColumn: '1 / -1' }}><strong style={{color:'var(--text-secondary)'}}>Notas:</strong> {selectedProduct.notes}</div>
                  )}
                  {/* Colores */}
                  {(selectedProduct.coloresDisponibles?.length > 0 || selectedProduct.coloresAdquiridos?.length > 0) && (
                    <div style={{ gridColumn: '1 / -1', background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
                      <h4 style={{ marginBottom: '0.75rem', color: 'var(--accent-primary)' }}>🎨 Colores</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
                        {selectedProduct.coloresDisponibles?.length > 0 && (
                          <div>
                            <strong style={{ color: 'var(--text-secondary)' }}>Disponibles:</strong>
                            <div style={{ marginTop: '0.3rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {selectedProduct.coloresDisponibles.map((c, i) => <span key={i} className="badge badge-info">{c}</span>)}
                            </div>
                          </div>
                        )}
                        {selectedProduct.coloresAdquiridos?.length > 0 && (
                          <div>
                            <strong style={{ color: 'var(--text-secondary)' }}>Adquiridos:</strong>
                            <div style={{ marginTop: '0.3rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {selectedProduct.coloresAdquiridos.map((c, i) => <span key={i} className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{c}</span>)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <PurchaseHistory 
                  productId={selectedProduct.id} 
                  currentStock={selectedProduct.stock} 
                  isClothing={!!selectedProduct.clothingDetails || categories.find(c => c.id === selectedProduct.categoryId)?.isClothing}
                />

                <div style={{ textAlign: 'right', marginTop: '2rem' }}>
                  <button className="btn btn-outline" onClick={() => setSelectedProduct(null)}>Cerrar</button>
                </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Eliminación / Descuento */}
          {manageProduct && (
            <ConfirmModal
              product={manageProduct}
              onClose={() => setManageProduct(null)}
              onDelete={handleDelete}
              onDiscount={handleDiscountStock}
              onEditStock={handleEditStock}
            />
          )}

          {/* Modal para Editar Producto */}
          {editingProduct && (
            <div 
              className="modal-overlay" 
              onClick={() => setEditingProduct(null)}
              style={{ 
                zIndex: 200, 
                display: 'flex', 
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '3vh 1.5rem 1.5rem',
                overflowY: 'auto',
              }}
            >
              <div 
                onClick={(e) => e.stopPropagation()}
                className="animate-fade-in"
                style={{ 
                  position: 'relative',
                  maxWidth: '900px', 
                  width: '100%',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--border-radius-lg, 12px)',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                }}
              >
                {/* Barra superior fija */}
                <div style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.5rem',
                  background: 'var(--bg-surface)',
                  borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
                  borderRadius: '12px 12px 0 0',
                }}>
                  <h3 style={{ color: 'var(--accent-primary)', margin: 0 }}>✏️ Editando: {editingProduct.name}</h3>
                  <button 
                    onClick={() => setEditingProduct(null)} 
                    className="btn btn-outline" 
                    style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                  >
                    ✕ Cerrar
                  </button>
                </div>

                {/* Contenido del formulario */}
                <div style={{ padding: '0.5rem' }}>
                  <ProductCapture editData={editingProduct} onClose={() => setEditingProduct(null)} />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* === PESTAÑA ADMINISTRAR === */}
      {mainTab === 'admin' && (
        <div className="admin-tab-content animate-fade-in">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Administra las categorías, materiales y tipos de prenda que aparecen en el formulario de captura de productos.
          </p>
          <CategoriesManager />
        </div>
      )}
      {/* Botón flotante Volver Arriba */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          title="Volver al inicio"
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 999,
            background: 'var(--accent-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(139,92,246,0.5)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ArrowUp size={22} />
        </button>
      )}
    </div>
  );
}
