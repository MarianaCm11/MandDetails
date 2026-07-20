import { useState } from 'react';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useFirestoreCollection from '../hooks/useFirestoreCollection';
import { Plus, Trash2, Edit2, NotepadText, Gift, CheckCircle } from 'lucide-react';
import './CustomerOrders.css';

const ORDER_STATUSES = [
  { id: 'pendiente_comprar', label: 'Pendiente de Comprar' },
  { id: 'pedido_realizado', label: 'Pedido Realizado' },
  { id: 'en_transito', label: 'En Tránsito' },
  { id: 'esperando_llegada', label: 'Esperando Llegada' },
  { id: 'listo_entrega', label: 'Listo para Entrega' }
];

const PAYMENT_STATUSES = [
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'parcial', label: 'Pago Parcial' },
  { id: 'pagado', label: 'Pagado' }
];

const DELIVERY_STATUSES = [
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'entregado', label: 'Entregado' }
];

export default function CustomerOrders() {
  const { data: orders, loading } = useFirestoreCollection('customerOrders', 'date');

  const [activeTab, setActiveTab] = useState('activos'); // 'activos' o 'entregas'
  const [isCreating, setIsCreating] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [advance, setAdvance] = useState('');
  const [items, setItems] = useState([{ name: '', quantity: 1, notes: '' }]);

  const [editingOrderId, setEditingOrderId] = useState(null);

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    if (items.length === 0 || !customerName) return;

    try {
      await addDoc(collection(db, 'customerOrders'), {
        customerName,
        items,
        notes,
        advance: Number(advance || 0),
        status: 'pendiente_comprar',
        date: serverTimestamp(),
        delivery: {
          arrivalDate: null,
          paymentStatus: Number(advance) > 0 ? 'parcial' : 'pendiente',
          deliveryStatus: 'pendiente'
        }
      });
      
      setIsCreating(false);
      setCustomerName('');
      setNotes('');
      setAdvance('');
      setItems([{ name: '', quantity: 1, notes: '' }]);
    } catch (error) {
      console.error(error);
      alert('Error guardando el encargo');
    }
  };

  const updateOrderStatus = async (id, currentData, newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'listo_entrega' && currentData.status !== 'listo_entrega') {
        updates['delivery.arrivalDate'] = serverTimestamp();
      }
      await updateDoc(doc(db, 'customerOrders', id), updates);
      setEditingOrderId(null);
    } catch (error) {
      console.error(error);
    }
  };

  const updateDeliveryStatus = async (id, field, value) => {
    try {
      await updateDoc(doc(db, 'customerOrders', id), { [`delivery.${field}`]: value });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('¿Eliminar este encargo permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'customerOrders', id));
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando encargos...</div>;

  const sortedOrders = [...orders].reverse();
  const activeOrders = sortedOrders.filter(o => o.status !== 'listo_entrega');
  const deliveryOrders = sortedOrders.filter(o => o.status === 'listo_entrega');

  return (
    <div className="customer-orders-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--accent-primary)' }}>Encargos de Clientes</h2>
        {!isCreating && activeTab === 'activos' && (
          <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
            <Plus size={20} /> Nuevo Encargo
          </button>
        )}
      </div>

      <div className="tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
        <button className={`text-btn ${activeTab === 'activos' ? 'active-tab' : ''}`} onClick={() => { setActiveTab('activos'); setIsCreating(false); }} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem' }}>
          📝 Encargos Activos ({activeOrders.length})
        </button>
        <button className={`text-btn ${activeTab === 'entregas' ? 'active-tab' : ''}`} onClick={() => { setActiveTab('entregas'); setIsCreating(false); }} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem' }}>
          🎁 Listos para Entrega ({deliveryOrders.length})
        </button>
      </div>

      {isCreating && activeTab === 'activos' && (
        <div className="glass-panel card animate-fade-in mb-6 notebook-style">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '2px dashed var(--glass-border)', paddingBottom: '0.5rem' }}>Hoja de Encargo</h3>
          
          <form onSubmit={handleSaveOrder}>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div className="form-group">
                <label>Nombre del Cliente</label>
                <input type="text" className="form-control" required value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Anticipo Dejado ($)</label>
                <input type="number" step="0.01" min="0" className="form-control" value={advance} onChange={e => setAdvance(e.target.value)} />
              </div>
            </div>

            <div className="inner-panel mb-4">
              <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Productos Solicitados</span>
                <button type="button" className="btn btn-outline" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={() => setItems([...items, { name: '', quantity: 1, notes: '' }])}>+ Producto</button>
              </h4>
              
              {items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                  <input type="text" placeholder="Producto o descripción" className="form-control" style={{ flex: 2 }} required value={it.name} onChange={e => { const newIt = [...items]; newIt[idx].name = e.target.value; setItems(newIt); }} />
                  <input type="number" placeholder="Cant." min="1" className="form-control" style={{ flex: 0.5 }} required value={it.quantity} onChange={e => { const newIt = [...items]; newIt[idx].quantity = Number(e.target.value); setItems(newIt); }} />
                  <input type="text" placeholder="Notas (Color, talla, etc.)" className="form-control" style={{ flex: 2 }} value={it.notes} onChange={e => { const newIt = [...items]; newIt[idx].notes = e.target.value; setItems(newIt); }} />
                  <button type="button" className="icon-btn icon-btn-danger" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>

            <div className="form-group mb-4">
              <label>Notas Generales del Pedido</label>
              <textarea className="form-control" rows="2" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej. Lo necesita para el viernes..."></textarea>
            </div>

            <div className="form-actions mt-4" style={{ paddingTop: '1.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsCreating(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={items.length === 0}>Guardar Encargo</button>
            </div>
          </form>
        </div>
      )}

      {/* Listado de Encargos Activos */}
      {activeTab === 'activos' && (
        <div className="grid grid-cols-3 gap-6">
          {activeOrders.length === 0 && !isCreating ? (
             <div className="glass-panel card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem' }}>
               <NotepadText size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
               <h3 style={{ marginBottom: '0.5rem' }}>Libreta Vacía</h3>
               <p style={{ color: 'var(--text-secondary)' }}>No tienes encargos activos pendientes.</p>
             </div>
          ) : (
            activeOrders.map(order => {
              const dateObj = order.date?.toDate ? order.date.toDate() : new Date();
              const statusObj = ORDER_STATUSES.find(s => s.id === order.status) || ORDER_STATUSES[0];

              return (
                <div key={order.id} className="glass-panel card animate-fade-in notebook-style" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem' }}>{order.customerName}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{dateObj.toLocaleDateString()}</div>
                    </div>
                    <button className="icon-btn icon-btn-danger" style={{ padding: '0.2rem' }} onClick={() => handleDeleteOrder(order.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', flex: 1 }}>
                    {order.items?.map((it, idx) => (
                      <li key={idx} style={{ marginBottom: '0.5rem' }}>
                        <strong>{it.quantity}x {it.name}</strong>
                        {it.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>- {it.notes}</div>}
                      </li>
                    ))}
                  </ul>

                  {order.notes && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px', margin: '1rem 0' }}>
                      <em>Nota: {order.notes}</em>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Anticipo:</span> <strong style={{ color: 'var(--status-success)' }}>${(order.advance || 0).toFixed(2)}</strong>
                    </div>
                    
                    {editingOrderId === order.id ? (
                      <select className="form-control" style={{ width: 'auto', fontSize: '0.8rem', padding: '0.2rem' }} autoFocus value={order.status} onChange={(e) => updateOrderStatus(order.id, order, e.target.value)} onBlur={() => setEditingOrderId(null)}>
                        {ORDER_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    ) : (
                      <span className="badge badge-warning" style={{ fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => setEditingOrderId(order.id)}>
                        {statusObj.label} <Edit2 size={10} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Listado de Listos para Entrega */}
      {activeTab === 'entregas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {deliveryOrders.length === 0 ? (
             <div className="glass-panel card" style={{ textAlign: 'center', padding: '4rem' }}>
               <Gift size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
               <h3 style={{ marginBottom: '0.5rem' }}>Sin entregas pendientes</h3>
               <p style={{ color: 'var(--text-secondary)' }}>Cuando marques un encargo como "Listo para entrega", aparecerá aquí.</p>
             </div>
          ) : (
            <div className="table-container glass-panel">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Productos</th>
                    <th>Llegada</th>
                    <th>Anticipo</th>
                    <th>Estado de Pago</th>
                    <th>Estado de Entrega</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryOrders.map(order => {
                    const arrDateObj = order.delivery?.arrivalDate?.toDate ? order.delivery.arrivalDate.toDate() : new Date();
                    
                    return (
                      <tr key={order.id}>
                        <td style={{ fontWeight: 600 }}>{order.customerName}</td>
                        <td>
                          <div style={{ fontSize: '0.85rem' }}>
                            {order.items?.map((it, i) => (
                              <div key={i}>{it.quantity}x {it.name}</div>
                            ))}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{arrDateObj.toLocaleDateString()}</td>
                        <td style={{ color: 'var(--status-success)', fontWeight: 600 }}>${(order.advance || 0).toFixed(2)}</td>
                        <td>
                          <select className="form-control" style={{ fontSize: '0.8rem', padding: '0.3rem' }} value={order.delivery?.paymentStatus || 'pendiente'} onChange={e => updateDeliveryStatus(order.id, 'paymentStatus', e.target.value)}>
                            {PAYMENT_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </td>
                        <td>
                          <select className="form-control" style={{ fontSize: '0.8rem', padding: '0.3rem' }} value={order.delivery?.deliveryStatus || 'pendiente'} onChange={e => updateDeliveryStatus(order.id, 'deliveryStatus', e.target.value)}>
                            {DELIVERY_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </td>
                        <td>
                          <button className="icon-btn icon-btn-danger" title="Eliminar registro" onClick={() => handleDeleteOrder(order.id)}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
