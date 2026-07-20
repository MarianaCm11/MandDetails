import { useState } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useFirestoreCollection from '../hooks/useFirestoreCollection';
import { Plus, History } from 'lucide-react';

export default function PurchaseHistory({ productId, currentStock, isClothing = false }) {
  const { data: history, loading } = useFirestoreCollection(`products/${productId}/purchaseHistory`, 'date');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newQty, setNewQty] = useState('');
  const [newUnitCost, setNewUnitCost] = useState('');
  const [newSize, setNewSize] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    if (!newQty || !newUnitCost) return;
    
    setIsSubmitting(true);
    try {
      const quantity = Number(newQty);
      const unitCost = Number(newUnitCost);
      const totalCost = quantity * unitCost;

      // 1. Añadir al historial
      await addDoc(collection(db, `products/${productId}/purchaseHistory`), {
        date: serverTimestamp(),
        quantity,
        unitCost,
        totalCost,
        size: isClothing ? newSize : '',
        note: note.trim()
      });

      // 2. Actualizar el stock del producto
      const newStock = (currentStock || 0) + quantity;
      await updateDoc(doc(db, 'products', productId), {
        stock: newStock
      });

      setNewQty('');
      setNewUnitCost('');
      setNewSize('');
      setNote('');
      setIsAdding(false);
    } catch (error) {
      console.error(error);
      alert('Error al registrar la compra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div>Cargando historial...</div>;

  // Ordenar el historial del más reciente al más antiguo para visualización
  const sortedHistory = [...history].reverse();

  return (
    <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)' }}>
          <History size={20} /> Historial de Inversión / Compras a Proveedores
        </h3>
        {!isAdding && (
          <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setIsAdding(true)}>
            <Plus size={16} /> Nueva Compra
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleAddPurchase} style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--border-radius-md)', marginBottom: '1rem' }} className="animate-fade-in">
          <h4 style={{ marginBottom: '0.8rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Registrar nuevo lote / compra</h4>
          <div style={{ display: 'grid', gridTemplateColumns: isClothing ? '1fr 1fr 1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem' }}>Cantidad Ingresada</label>
              <input type="number" min="1" required className="form-control" value={newQty} onChange={e => setNewQty(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem' }}>Costo Unitario ($)</label>
              <input type="number" step="0.01" min="0" required className="form-control" value={newUnitCost} onChange={e => setNewUnitCost(e.target.value)} />
            </div>
            {isClothing && (
              <div>
                <label style={{ fontSize: '0.8rem' }}>Talla (Opcional)</label>
                <select className="form-control" value={newSize} onChange={e => setNewSize(e.target.value)}>
                  <option value="">N/A</option>
                  {['XXS','XS','S','M','G','XG','XXG','XXXG','4XG+'].map(sz => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.8rem' }}>Nota (opcional)</label>
              <input type="text" className="form-control" placeholder="Ej. Lote de Shein 15 May" value={note} onChange={e => setNote(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn text-btn" onClick={() => setIsAdding(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>Guardar Compra</button>
          </div>
        </form>
      )}

      {sortedHistory.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
          No hay compras a proveedores registradas para este producto.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="inv-table" style={{ fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Fecha</th>
                {isClothing && <th>Talla</th>}
                <th>Cantidad</th>
                <th>Costo Unitario</th>
                <th>Costo Total</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {sortedHistory.map(h => {
                const dateObj = h.date?.toDate ? h.date.toDate() : new Date();
                return (
                  <tr key={h.id}>
                    <td>{dateObj.toLocaleDateString()}</td>
                    {isClothing && <td><span className="badge" style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}>{h.size || '—'}</span></td>}
                    <td><span className="badge badge-info">{h.quantity} pzas</span></td>
                    <td>${(h.unitCost || 0).toFixed(2)}</td>
                    <td style={{ fontWeight: 600 }}>${(h.totalCost || 0).toFixed(2)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{h.note || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
