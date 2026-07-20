import { useState } from 'react';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import useFirestoreCollection from '../hooks/useFirestoreCollection';
import { Plus, Trash2, Search, Package, TrendingUp } from 'lucide-react';
import './Kits.css';

// Obtiene el costo promedio de un producto desde su historial de compras
async function getAverageCost(productId) {
  try {
    const histSnap = await getDocs(collection(db, `products/${productId}/purchaseHistory`));
    let totalCost = 0;
    let totalQty = 0;
    histSnap.forEach(doc => {
      const d = doc.data();
      totalCost += (d.unitCost || 0) * (d.quantity || 1);
      totalQty += d.quantity || 1;
    });
    return totalQty > 0 ? totalCost / totalQty : 0;
  } catch (error) {
    return 0;
  }
}

export default function Kits() {
  const { data: products } = useFirestoreCollection('products');
  const { data: kits, loading: kitsLoading } = useFirestoreCollection('kits', 'createdAt');

  const [isCreating, setIsCreating] = useState(false);
  const [kitName, setKitName] = useState('');
  const [kitSalePrice, setKitSalePrice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [components, setComponents] = useState([]); // { productId, productName, quantity, unitSalePrice, unitCost }
  const [isSaving, setIsSaving] = useState(false);

  // Agregar producto al kit (carga también su costo promedio)
  const handleAddComponent = async (product) => {
    const existing = components.find(c => c.productId === product.id);
    if (existing) {
      setComponents(components.map(c =>
        c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      const avgCost = await getAverageCost(product.id);
      setComponents([...components, {
        productId: product.id,
        productName: product.name,
        unitSalePrice: product.pricing?.baseSalePrice || 0,
        unitCost: avgCost,
        quantity: 1
      }]);
    }
    setSearchTerm('');
  };

  const updateQty = (id, delta) => {
    setComponents(prev => prev.map(c => {
      if (c.productId !== id) return c;
      const newQty = c.quantity + delta;
      return newQty > 0 ? { ...c, quantity: newQty } : c;
    }));
  };

  const removeComponent = (id) => {
    setComponents(prev => prev.filter(c => c.productId !== id));
  };

  // Cálculos del kit
  const kitRetailValue = components.reduce((sum, c) => sum + (c.unitSalePrice * c.quantity), 0);
  const kitTotalCost = components.reduce((sum, c) => sum + (c.unitCost * c.quantity), 0);
  const salePrice = Number(kitSalePrice) || kitRetailValue;
  const kitUtility = salePrice - kitTotalCost;

  const handleSaveKit = async (e) => {
    e.preventDefault();
    if (!kitName || components.length === 0) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'kits'), {
        name: kitName,
        components,
        kitRetailValue,
        kitTotalCost,
        salePrice,
        kitUtility: salePrice - kitTotalCost,
        createdAt: serverTimestamp()
      });
      setIsCreating(false);
      setKitName('');
      setKitSalePrice('');
      setComponents([]);
    } catch (error) {
      console.error(error);
      alert('Error al guardar el Kit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKit = async (id) => {
    if (!window.confirm('¿Eliminar este kit?')) return;
    try { await deleteDoc(doc(db, 'kits', id)); } catch (err) { console.error(err); }
  };

  const filteredProducts = products.filter(p =>
    !p.isDeleted && searchTerm && p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 5);

  if (kitsLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando kits...</div>;

  return (
    <div className="kits-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--accent-primary)' }}>Kits y Colecciones</h2>
        {!isCreating && (
          <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
            <Plus size={20} /> Crear Nuevo Kit
          </button>
        )}
      </div>

      {isCreating && (
        <div className="glass-panel card animate-fade-in mb-4">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>Armar Nuevo Kit</h3>

          <form onSubmit={handleSaveKit}>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div className="form-group">
                <label>Nombre del Kit</label>
                <input type="text" className="form-control" required value={kitName} onChange={e => setKitName(e.target.value)} placeholder="Ej. Kit Regalo San Valentín" />
              </div>
              <div className="form-group">
                <label>Precio de Venta del Kit ($)</label>
                <input type="number" step="0.01" className="form-control" value={kitSalePrice} onChange={e => setKitSalePrice(e.target.value)} placeholder={`Sugerido: $${kitRetailValue.toFixed(2)}`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Buscador */}
              <div className="inner-panel">
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Search size={18} /> Buscar Productos
                </h4>
                <div className="form-group" style={{ position: 'relative' }}>
                  <input type="text" className="form-control" placeholder="Escribir nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  {searchTerm && filteredProducts.length > 0 && (
                    <ul style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-surface-elevated)', border: '1px solid var(--glass-border)', borderRadius: 'var(--border-radius-sm)', zIndex: 20, listStyle: 'none', padding: 0, margin: 0 }}>
                      {filteredProducts.map(p => (
                        <li key={p.id} onClick={() => handleAddComponent(p)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.1)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <div>
                            <strong>{p.name}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stock: {p.stock} | Venta: ${p.pricing?.baseSalePrice}</div>
                          </div>
                          <Plus size={16} color="var(--accent-primary)" />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Contenido del kit */}
              <div className="inner-panel" style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={18} /> Contenido del Kit
                </h4>

                {components.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0', fontSize: '0.9rem' }}>Busca y agrega productos.</p>
                ) : (
                  <ul className="kit-components-list">
                    {components.map(c => (
                      <li key={c.productId} className="kit-comp-item animate-fade-in">
                        <div style={{ flex: 1, fontSize: '0.9rem' }}>
                          <strong>{c.productName}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Costo: ${c.unitCost.toFixed(2)} | Venta: ${c.unitSalePrice}
                          </div>
                        </div>
                        <div className="qty-controls">
                          <button type="button" onClick={() => updateQty(c.productId, -1)}>-</button>
                          <span>{c.quantity}</span>
                          <button type="button" onClick={() => updateQty(c.productId, 1)}>+</button>
                        </div>
                        <button type="button" className="icon-btn icon-btn-danger" style={{ padding: '0.2rem' }} onClick={() => removeComponent(c.productId)}>
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {components.length > 0 && (
                  <div className="kit-summary mt-4">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                      <span>Costo Total del Kit:</span>
                      <strong style={{ color: 'var(--status-error)' }}>−${kitTotalCost.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                      <span>Valor Comercial (suma):</span>
                      <strong>${kitRetailValue.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 700, color: kitUtility >= 0 ? 'var(--status-success)' : 'var(--status-error)' }}>
                      <span>Utilidad Proyectada:</span>
                      <span>${kitUtility.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions mt-4" style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsCreating(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={components.length === 0 || isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar Kit'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listado de Kits */}
      <div className="grid grid-cols-2 gap-6">
        {kits.length === 0 && !isCreating ? (
          <div className="glass-panel card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
            <Package size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No hay kits creados</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Agrupa productos para venderlos como conjunto.</p>
          </div>
        ) : (
          [...kits].reverse().map(kit => (
            <div key={kit.id} className="glass-panel card animate-fade-in" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: 'var(--accent-primary)' }}>{kit.name}</h3>
                <button className="icon-btn icon-btn-danger" onClick={() => handleDeleteKit(kit.id)}><Trash2 size={16} /></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem', background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Costo Total</div>
                  <div style={{ fontWeight: 600, color: 'var(--status-error)' }}>${(kit.kitTotalCost || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Precio Venta</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>${(kit.salePrice || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Utilidad</div>
                  <div style={{ fontWeight: 700, color: (kit.kitUtility || 0) >= 0 ? 'var(--status-success)' : 'var(--status-error)' }}>
                    ${(kit.kitUtility || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Contenido:</h5>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.875rem' }}>
                {kit.components.map(c => (
                  <li key={c.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px dashed var(--glass-border)' }}>
                    <span>{c.quantity}× {c.productName}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Costo: ${(c.unitCost || 0).toFixed(2)} | Venta: ${c.unitSalePrice}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
