import { useState } from 'react';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useFirestoreCollection from '../hooks/useFirestoreCollection';
import { Plus, Trash2, Search, HandCoins, AlertCircle, History, Edit2, Save, X } from 'lucide-react';
import './Debts.css';

export default function Debts() {
  const { data: debts, loading: debtsLoading } = useFirestoreCollection('debts', 'date');
  const { data: products } = useFirestoreCollection('products');
  const { data: categories } = useFirestoreCollection('categories', 'name');

  const [isCreating, setIsCreating] = useState(false);
  const [debtorName, setDebtorName] = useState('');
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedDebtCategory, setSelectedDebtCategory] = useState('');
  const [alreadyDelivered, setAlreadyDelivered] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [activeAbonoDebtId, setActiveAbonoDebtId] = useState(null);
  const [abonoAmount, setAbonoAmount] = useState('');

  const [editingDebtId, setEditingDebtId] = useState(null);
  const [editDebtorName, setEditDebtorName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTotalAmount, setEditTotalAmount] = useState('');

  const handleCreateDebt = async (e) => {
    e.preventDefault();
    if (!debtorName || !totalAmount) return;

    try {
      // 1. Guardar deuda
      await addDoc(collection(db, 'debts'), {
        debtorName,
        description: selectedProduct ? `[${selectedProduct.name}] ${description}` : description,
        productId: selectedProduct ? selectedProduct.id : null,
        totalAmount: Number(totalAmount),
        paidAmount: 0,
        payments: [], // { date, amount }
        status: 'activa',
        date: serverTimestamp()
      });

      // 2. Descontar stock si se seleccionó producto
      if (selectedProduct) {
        const newStock = Math.max(0, (selectedProduct.stock || 0) - 1);
        await updateDoc(doc(db, 'products', selectedProduct.id), { stock: newStock });
      }

      setIsCreating(false);
      setDebtorName('');
      setDescription('');
      setTotalAmount('');
      setSelectedProduct(null);
      setSelectedDebtCategory('');
      setAlreadyDelivered(false);
      setSearchTerm('');
    } catch (error) {
      console.error(error);
      alert('Error registrando la deuda');
    }
  };

  const handleAddPayment = async (e, debt) => {
    e.preventDefault();
    if (!abonoAmount || Number(abonoAmount) <= 0) return;

    const amount = Number(abonoAmount);
    const newPaidAmount = (debt.paidAmount || 0) + amount;
    const remaining = debt.totalAmount - newPaidAmount;
    
    try {
      const newPayment = {
        amount,
        date: new Date().toISOString() // usamos ISO para simplificar
      };

      const updates = {
        paidAmount: newPaidAmount,
        payments: [...(debt.payments || []), newPayment],
        status: remaining <= 0 ? 'pagada' : 'activa'
      };

      await updateDoc(doc(db, 'debts', debt.id), updates);
      
      setActiveAbonoDebtId(null);
      setAbonoAmount('');
    } catch (error) {
      console.error(error);
      alert('Error registrando abono');
    }
  };

  const handleDeleteDebt = async (id, isPaid) => {
    if (!isPaid && !window.confirm('Esta deuda no está pagada. ¿Estás seguro de eliminarla?')) return;
    try {
      await deleteDoc(doc(db, 'debts', id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateDebt = async (id) => {
    if (!editDebtorName.trim() || !editTotalAmount) return;
    try {
      await updateDoc(doc(db, 'debts', id), {
        debtorName: editDebtorName.trim(),
        description: editDescription,
        totalAmount: Number(editTotalAmount)
      });
      setEditingDebtId(null);
    } catch (error) {
      console.error(error);
      alert('Error actualizando la deuda');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = selectedDebtCategory ? p.categoryId === selectedDebtCategory : true;
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
    // Si ya fue entregado, busca en todos (incluso stock 0), si no solo con stock > 0
    const hasStock = alreadyDelivered ? true : Number(p.stock) > 0;
    return !p.isDeleted && matchesCat && matchesSearch && hasStock;
  });

  if (debtsLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando deudas...</div>;

  const activeDebts = debts.filter(d => d.status === 'activa');
  const paidDebts = debts.filter(d => d.status === 'pagada');

  return (
    <div className="debts-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--accent-primary)' }}>Gestión de Deudas</h2>
        {!isCreating && (
          <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
            <Plus size={20} /> Registrar Nueva Deuda
          </button>
        )}
      </div>

      {isCreating && (
        <div className="glass-panel card animate-fade-in mb-6" style={{ borderLeft: '4px solid var(--status-error)' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--accent-primary)' }}>Registrar Deudor</h3>
          
          <form onSubmit={handleCreateDebt}>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div className="form-group">
                <label>Nombre de la persona</label>
                <input type="text" className="form-control" required value={debtorName} onChange={e => setDebtorName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Monto Total de la Deuda ($)</label>
                <input type="number" step="0.01" min="1" className="form-control" required value={totalAmount} onChange={e => setTotalAmount(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-4">
              <div className="form-group">
                <label>Concepto / Notas</label>
                <textarea className="form-control" rows="3" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Presté dinero, o le fié unos aretes..."></textarea>
              </div>

              <div className="form-group badge-warning-bg" style={{ padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={16} color="var(--status-warning)" />
                  ¿Es un producto del inventario? (Opcional)
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Si seleccionas un producto, se le descontará 1 pieza al stock automáticamente.</p>
                
                {selectedProduct ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', padding: '0.5rem', borderRadius: '4px' }}>
                    <span>✅ {selectedProduct.name}</span>
                    <button type="button" className="text-btn text-error" onClick={() => setSelectedProduct(null)}>Quitar</button>
                  </div>
                ) : (
                  <>
                    <select className="form-control mb-2" value={selectedDebtCategory} onChange={e => setSelectedDebtCategory(e.target.value)}>
                      <option value="">Todas las categorías</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    {/* ¿Ya fue entregado? */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={alreadyDelivered}
                        onChange={e => setAlreadyDelivered(e.target.checked)}
                      />
                      <span style={{ color: alreadyDelivered ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                        ¿Ya fue entregado? (busca aunque el stock sea 0)
                      </span>
                    </label>

                    <input type="text" className="form-control mb-2" placeholder="Buscar producto por nombre..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} disabled={!selectedDebtCategory && categories.length > 0} />
                    
                    {searchTerm && (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: '150px', overflowY: 'auto', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                        {filteredProducts.map(p => (
                          <li key={p.id} style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)' }} onClick={() => { setSelectedProduct(p); setTotalAmount(p.pricing?.baseSalePrice || ''); setSearchTerm(''); }}>
                            {p.name} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(${p.pricing?.baseSalePrice})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="form-actions mt-4" style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsCreating(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" style={{ background: 'var(--status-error)' }}>Registrar Deuda</button>
            </div>
          </form>
        </div>
      )}

      {/* Listado de Deudas Activas */}
      <h3 style={{ marginBottom: '1rem', color: 'var(--status-error)' }}>Deudas Activas ({activeDebts.length})</h3>
      <div className="grid grid-cols-2 gap-6 mb-8">
        {activeDebts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No hay deudas activas. ¡Todo excelente! 🎉</p>
        ) : (
          activeDebts.map(debt => {
            const dateObj = debt.date?.toDate ? debt.date.toDate() : new Date();
            const remaining = debt.totalAmount - (debt.paidAmount || 0);

            return (
              <div key={debt.id} className="glass-panel card animate-fade-in" style={{ padding: '1.5rem', borderTop: '3px solid var(--status-error)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  {editingDebtId === debt.id ? (
                    <div style={{ flex: 1, marginRight: '1rem' }}>
                      <input type="text" className="form-control mb-2" value={editDebtorName} onChange={e => setEditDebtorName(e.target.value)} placeholder="Nombre del deudor" />
                      <input type="number" step="0.01" min="1" className="form-control" value={editTotalAmount} onChange={e => setEditTotalAmount(e.target.value)} placeholder="Monto total ($)" />
                    </div>
                  ) : (
                    <div>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{debt.debtorName}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Registrada: {dateObj.toLocaleDateString()}</div>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {editingDebtId === debt.id ? (
                      <>
                        <button className="icon-btn text-success" onClick={() => handleUpdateDebt(debt.id)}>
                          <Save size={16} />
                        </button>
                        <button className="icon-btn" onClick={() => setEditingDebtId(null)}>
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="icon-btn text-primary" onClick={() => {
                          setEditingDebtId(debt.id);
                          setEditDebtorName(debt.debtorName);
                          setEditDescription(debt.description);
                          setEditTotalAmount(debt.totalAmount);
                        }}>
                          <Edit2 size={16} />
                        </button>
                        <button className="icon-btn icon-btn-danger" onClick={() => handleDeleteDebt(debt.id, false)}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                  <strong>Concepto:</strong> 
                  {editingDebtId === debt.id ? (
                    <textarea className="form-control mt-2" rows="2" value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Concepto / Notas"></textarea>
                  ) : (
                    <> {debt.description || 'Sin descripción'}</>
                  )}
                </div>

                <div className="debt-progress">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    <span>Abonado: <strong style={{ color: 'var(--status-success)' }}>${(debt.paidAmount || 0).toFixed(2)}</strong></span>
                    <span>Total: <strong>${(debt.totalAmount || 0).toFixed(2)}</strong></span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(100, ((debt.paidAmount || 0) / debt.totalAmount) * 100)}%` }}></div>
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '0.5rem', fontSize: '1.1rem', fontWeight: 600, color: 'var(--status-error)' }}>
                    Resta: ${remaining.toFixed(2)}
                  </div>
                </div>

                {activeAbonoDebtId === debt.id ? (
                  <form onSubmit={(e) => handleAddPayment(e, debt)} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', background: 'var(--bg-surface)', padding: '0.5rem', borderRadius: '4px' }}>
                    <input type="number" step="0.01" min="1" max={remaining} className="form-control" autoFocus required value={abonoAmount} onChange={e => setAbonoAmount(e.target.value)} placeholder="Monto $" />
                    <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem' }}>Abonar</button>
                    <button type="button" className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }} onClick={() => setActiveAbonoDebtId(null)}>✕</button>
                  </form>
                ) : (
                  <button className="btn btn-outline mt-4" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setActiveAbonoDebtId(debt.id)}>
                    <HandCoins size={18} /> Registrar Abono
                  </button>
                )}

                {/* Historial corto de abonos */}
                {debt.payments && debt.payments.length > 0 && (
                  <div style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
                    <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}><History size={14} /> Historial de Abonos</h5>
                    {debt.payments.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', borderBottom: '1px dashed var(--glass-border)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{new Date(p.date).toLocaleDateString()}</span>
                        <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>+ ${p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Listado de Deudas Pagadas */}
      {paidDebts.length > 0 && (
        <>
          <h3 style={{ marginBottom: '1rem', color: 'var(--status-success)' }}>Deudas Liquidadas ({paidDebts.length})</h3>
          <div className="grid grid-cols-3 gap-4">
            {paidDebts.map(debt => (
              <div key={debt.id} className="glass-panel" style={{ padding: '1rem', opacity: 0.7, borderLeft: '3px solid var(--status-success)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ textDecoration: 'line-through' }}>{debt.debtorName}</strong>
                  <button className="icon-btn text-muted" onClick={() => handleDeleteDebt(debt.id, true)}><Trash2 size={14} /></button>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pagó: ${debt.totalAmount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}
