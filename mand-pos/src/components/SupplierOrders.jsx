import { useState } from 'react';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useFirestoreCollection from '../hooks/useFirestoreCollection';
import { Plus, Trash2, Truck, DollarSign, Edit2 } from 'lucide-react';
import './SupplierOrders.css';

const PURPOSES = [
  { id: 'venta', label: 'Venta' },
  { id: 'personal', label: 'Uso Personal' },
  { id: 'regalo', label: 'Regalo' }
];

const STATUSES = [
  { id: 'pendiente', label: 'Pendiente / Realizado' },
  { id: 'en_transito', label: 'En Tránsito' },
  { id: 'recibido', label: 'Recibido' }
];

export default function SupplierOrders() {
  const { data: orders, loading } = useFirestoreCollection('supplierOrders', 'date');

  const [isCreating, setIsCreating] = useState(false);
  const [providerName, setProviderName] = useState('');
  
  const [items, setItems] = useState([{ name: '', quantity: 1, unitCost: 0, purpose: 'venta' }]);
  const [extraCosts, setExtraCosts] = useState([{ concept: 'Envío', amount: 0 }]);

  const [editingStatusId, setEditingStatusId] = useState(null);

  const totalProductsCost = items.reduce((sum, it) => sum + (it.quantity * it.unitCost), 0);
  const totalExtraCosts = extraCosts.reduce((sum, ex) => sum + Number(ex.amount), 0);
  const grandTotal = totalProductsCost + totalExtraCosts;

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;

    try {
      await addDoc(collection(db, 'supplierOrders'), {
        providerName,
        items,
        extraCosts,
        totalProductsCost,
        totalExtraCosts,
        grandTotal,
        status: 'pendiente',
        date: serverTimestamp()
      });
      
      setIsCreating(false);
      setProviderName('');
      setItems([{ name: '', quantity: 1, unitCost: 0, purpose: 'venta' }]);
      setExtraCosts([{ concept: 'Envío', amount: 0 }]);
    } catch (error) {
      console.error(error);
      alert('Error guardando el pedido');
    }
  };

  const updateOrderStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'supplierOrders', id), { status: newStatus });
      setEditingStatusId(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('¿Eliminar este pedido permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'supplierOrders', id));
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando pedidos...</div>;

  const sortedOrders = [...orders].reverse(); // Más recientes primero

  return (
    <div className="supplier-orders-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--accent-primary)' }}>Pedidos a Proveedores</h2>
        {!isCreating && (
          <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
            <Plus size={20} /> Registrar Nuevo Pedido
          </button>
        )}
      </div>

      {isCreating && (
        <div className="glass-panel card animate-fade-in mb-6">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>Registrar Compra / Pedido</h3>
          
          <form onSubmit={handleSaveOrder}>
            <div className="form-group mb-4" style={{ maxWidth: '400px' }}>
              <label>Proveedor / Tienda (Ej. Shein, AliExpress)</label>
              <input type="text" className="form-control" required value={providerName} onChange={e => setProviderName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Productos */}
              <div className="inner-panel">
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Productos Solicitados</span>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setItems([...items, { name: '', quantity: 1, unitCost: 0, purpose: 'venta' }])}>+ Producto</button>
                </h4>
                
                {items.map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                    <input type="text" placeholder="Producto" className="form-control" style={{ flex: 2 }} required value={it.name} onChange={e => { const newIt = [...items]; newIt[idx].name = e.target.value; setItems(newIt); }} />
                    <input type="number" placeholder="Cant." min="1" className="form-control" style={{ flex: 1 }} required value={it.quantity} onChange={e => { const newIt = [...items]; newIt[idx].quantity = Number(e.target.value); setItems(newIt); }} />
                    <input type="number" placeholder="Costo C/U $" step="0.01" min="0" className="form-control" style={{ flex: 1 }} required value={it.unitCost} onChange={e => { const newIt = [...items]; newIt[idx].unitCost = Number(e.target.value); setItems(newIt); }} />
                    <select className="form-control" style={{ flex: 1.5 }} value={it.purpose} onChange={e => { const newIt = [...items]; newIt[idx].purpose = e.target.value; setItems(newIt); }}>
                      {PURPOSES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                    <button type="button" className="icon-btn icon-btn-danger" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>

              {/* Gastos Extras */}
              <div className="inner-panel badge-warning-bg">
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Gastos Adicionales</span>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setExtraCosts([...extraCosts, { concept: '', amount: 0 }])}>+ Gasto</button>
                </h4>

                {extraCosts.map((ex, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                    <input type="text" placeholder="Concepto (Ej. Envío, Seguro)" className="form-control" style={{ flex: 2 }} required value={ex.concept} onChange={e => { const newEx = [...extraCosts]; newEx[idx].concept = e.target.value; setExtraCosts(newEx); }} />
                    <input type="number" placeholder="Monto $" step="0.01" min="0" className="form-control" style={{ flex: 1 }} required value={ex.amount} onChange={e => { const newEx = [...extraCosts]; newEx[idx].amount = Number(e.target.value); setExtraCosts(newEx); }} />
                    <button type="button" className="icon-btn icon-btn-danger" onClick={() => setExtraCosts(extraCosts.filter((_, i) => i !== idx))}><Trash2 size={16} /></button>
                  </div>
                ))}

                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Costo Productos:</span> <strong>${totalProductsCost.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--status-warning)' }}>
                    <span>Gastos Extras:</span> <strong>${totalExtraCosts.toFixed(2)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--status-error)' }}>
                    <span>Costo Total del Pedido:</span> <span>${grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions mt-4" style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsCreating(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={items.length === 0}>Guardar Pedido</button>
            </div>
          </form>
        </div>
      )}

      {/* Historial de Pedidos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {sortedOrders.length === 0 && !isCreating ? (
           <div className="glass-panel card" style={{ textAlign: 'center', padding: '4rem' }}>
             <Truck size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
             <h3 style={{ marginBottom: '0.5rem' }}>No hay pedidos registrados</h3>
             <p style={{ color: 'var(--text-secondary)' }}>Lleva el control de todas tus compras a proveedores aquí.</p>
           </div>
        ) : (
          sortedOrders.map(order => {
            const dateObj = order.date?.toDate ? order.date.toDate() : new Date();
            const statusObj = STATUSES.find(s => s.id === order.status) || STATUSES[0];

            return (
              <div key={order.id} className="glass-panel card animate-fade-in" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Truck size={20} color="var(--accent-primary)" />
                      {order.providerName || 'Proveedor Desconocido'}
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Fecha: {dateObj.toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    
                    {/* Status Editor */}
                    {editingStatusId === order.id ? (
                      <select className="form-control" autoFocus value={order.status} onChange={(e) => updateOrderStatus(order.id, e.target.value)} onBlur={() => setEditingStatusId(null)}>
                        {STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    ) : (
                      <span className={`badge ${order.status === 'recibido' ? 'badge-success' : order.status === 'en_transito' ? 'badge-info' : 'badge-warning'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => setEditingStatusId(order.id)}>
                        {statusObj.label} <Edit2 size={12} />
                      </span>
                    )}

                    <button className="icon-btn icon-btn-danger" onClick={() => handleDeleteOrder(order.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--border-radius-sm)' }}>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Productos:</h5>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.85rem' }}>
                      {order.items?.map((it, idx) => (
                        <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                          <span>{it.quantity}x {it.name} <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)' }}>({it.purpose})</span></span>
                          <span>${(it.unitCost * it.quantity).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', display: 'flex', flexDirection: 'column' }}>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Resumen Financiero:</h5>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Productos:</span> <span>${(order.totalProductsCost || 0).toFixed(2)}</span>
                      </div>
                      {order.extraCosts?.map((ex, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-warning)' }}>
                          <span>{ex.concept}:</span> <span>+ ${(ex.amount || 0).toFixed(2)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--glass-border)', fontSize: '1rem', fontWeight: 600 }}>
                        <span>Total Pagado:</span> <span style={{ color: 'var(--status-error)' }}>${(order.grandTotal || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
