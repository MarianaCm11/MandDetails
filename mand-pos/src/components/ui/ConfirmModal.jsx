import { useState } from 'react';
import { X, AlertTriangle, MinusCircle, Trash2, Edit3 } from 'lucide-react';
import './ConfirmModal.css';

/**
 * Modal personalizado para administrar, eliminar o descontar stock
 * @param {Object} props
 * @param {Object} props.product - El producto completo
 * @param {Function} props.onClose - Cierra el modal
 * @param {Function} props.onDelete - Acción para eliminar completo (id)
 * @param {Function} props.onDiscount - Acción para descontar stock (id, amount)
 * @param {Function} props.onEditStock - Acción para setear stock (id, amount)
 */
export default function ConfirmModal({ product, onClose, onDelete, onDiscount, onEditStock }) {
  const [discountAmount, setDiscountAmount] = useState(1);
  const [newStockAmount, setNewStockAmount] = useState(product?.stock || 0);
  const [mode, setMode] = useState('select'); // select, discount, edit_stock, delete
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!product) return null;

  const handleDiscountSubmit = (e) => {
    e.preventDefault();
    if (discountAmount > 0 && discountAmount <= product.stock) {
      onDiscount(product.id, discountAmount);
    }
  };

  const handleEditStockSubmit = (e) => {
    e.preventDefault();
    if (newStockAmount >= 0) {
      onEditStock(product.id, newStockAmount);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ color: 'var(--accent-primary)' }}>Administrar Producto</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>{product.name}</p>
            <p style={{ color: 'var(--text-secondary)' }}>Stock actual: <strong>{product.stock || 0}</strong> piezas</p>
          </div>

          {mode === 'select' && (
            <div className="action-options">
              <button 
                className="btn btn-outline action-box" 
                onClick={() => setMode('discount')}
                disabled={(product.stock || 0) <= 0}
              >
                <MinusCircle size={24} style={{ color: 'var(--status-warning)' }} />
                <span>Descontar Stock (Venta)</span>
                <small>Resta piezas y suma el dinero a tus ganancias globales.</small>
              </button>

              <button 
                className="btn btn-outline action-box" 
                onClick={() => setMode('edit_stock')}
              >
                <Edit3 size={24} style={{ color: 'var(--accent-primary)' }} />
                <span>Ajustar Stock Total</span>
                <small>Corrige la cantidad exacta disponible sin afectar tus ganancias.</small>
              </button>

              <button className="btn btn-outline action-box danger-box" onClick={() => setMode('delete')}>
                <Trash2 size={24} style={{ color: 'var(--status-error)' }} />
                <span>Dar de Baja Producto</span>
                <small>Marca este producto como eliminado de forma segura.</small>
              </button>
            </div>
          )}

          {mode === 'discount' && (
            <form onSubmit={handleDiscountSubmit} className="discount-form animate-fade-in">
              <div className="form-group">
                <label>Cantidad a descontar</label>
                <input 
                  type="number" 
                  className="form-control" 
                  min="1" 
                  max={product.stock}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  autoFocus
                />
              </div>
              <div className="preview-stock">
                <p>Stock final resultante:</p>
                <div className="stock-calc">
                  <span>{product.stock}</span> - <span>{discountAmount}</span> = 
                  <strong style={{ color: 'var(--accent-primary)', fontSize: '1.2rem', marginLeft: '0.5rem' }}>
                    {product.stock - discountAmount}
                  </strong>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setMode('select')}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Confirmar Descuento</button>
              </div>
            </form>
          )}

          {mode === 'edit_stock' && (
            <form onSubmit={handleEditStockSubmit} className="discount-form animate-fade-in">
              <div className="warning-banner" style={{ marginBottom: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}>
                <p>Usa esto para corregir el inventario físico sin sumar el valor a tus ganancias.</p>
              </div>
              <div className="form-group">
                <label>Stock disponible actualmente *</label>
                <input 
                  type="number" 
                  className="form-control" 
                  min="0" 
                  value={newStockAmount}
                  onChange={(e) => setNewStockAmount(Number(e.target.value))}
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setMode('select')}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Stock</button>
              </div>
            </form>
          )}

          {mode === 'delete' && (
            <div className="delete-confirm animate-fade-in">
              <div className="warning-banner" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)', borderColor: 'var(--status-error)', marginBottom: '1.5rem' }}>
                <AlertTriangle size={24} />
                <p>Marcar <strong>{product.name}</strong> como Artículo Eliminado</p>
              </div>
              <p style={{ margin: '1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Para evitar accidentes, ya no eliminamos productos para siempre. El producto se ocultará del inventario activo y de las ventas, pero se conservará su historial de costos y ventas.
              </p>
              <div className="form-group" style={{ margin: '1.5rem 0' }}>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={confirmDelete} 
                    onChange={(e) => setConfirmDelete(e.target.checked)} 
                  />
                  <span>Confirmar: deseo marcar este artículo como eliminado</span>
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setMode('select')}>Cancelar</button>
                <button 
                  type="button" 
                  className="btn" 
                  disabled={!confirmDelete}
                  style={{ 
                    background: confirmDelete ? 'var(--status-error)' : 'var(--text-muted)', 
                    color: 'white',
                    cursor: confirmDelete ? 'pointer' : 'not-allowed'
                  }} 
                  onClick={() => onDelete(product.id)}
                >
                  Marcar como Eliminado
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
