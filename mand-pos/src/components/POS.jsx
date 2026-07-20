import { useState, useMemo } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import useFirestoreCollection from '../hooks/useFirestoreCollection';
import { Search, ShoppingCart, Trash2, Tag, CheckCircle, Package } from 'lucide-react';
import './POS.css';

export default function POS() {
  const { data: products } = useFirestoreCollection('products');
  const { data: kits } = useFirestoreCollection('kits');

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]); // { type: 'product'|'kit', item: {}, quantity: 1 }
  const [discountType, setDiscountType] = useState('none'); // 'none', 'percentage', 'fixed'
  const [discountValue, setDiscountValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 1. Buscador y Filtro
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    
    const matchedProducts = products.filter(p => 
      !p.isDeleted && (p.name?.toLowerCase().includes(term) || p.tags?.some(t => t.toLowerCase().includes(term)))
    ).map(p => ({ ...p, resultType: 'product' }));

    const matchedKits = kits.filter(k => 
      k.name?.toLowerCase().includes(term)
    ).map(k => ({ ...k, resultType: 'kit' }));

    return [...matchedProducts, ...matchedKits].slice(0, 8);
  }, [searchTerm, products, kits]);

  // 2. Manejo del Carrito
  const addToCart = (result) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(c => c.item.id === result.id && c.type === result.resultType);
      if (existingIdx >= 0) {
        const newCart = [...prev];
        newCart[existingIdx].quantity += 1;
        return newCart;
      }
      return [...prev, { type: result.resultType, item: result, quantity: 1 }];
    });
    setSearchTerm('');
  };

  const updateQuantity = (index, delta) => {
    setCart(prev => {
      const newCart = [...prev];
      newCart[index].quantity += delta;
      if (newCart[index].quantity <= 0) {
        newCart.splice(index, 1);
      }
      return newCart;
    });
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // 3. Cálculos
  const subtotal = cart.reduce((sum, cartItem) => {
    const price = cartItem.type === 'kit' ? cartItem.item.salePrice : (cartItem.item.pricing?.baseSalePrice || 0);
    return sum + (price * cartItem.quantity);
  }, 0);

  let discountAmount = 0;
  const val = Number(discountValue) || 0;
  if (discountType === 'percentage' && val > 0) {
    discountAmount = subtotal * (val / 100);
  } else if (discountType === 'fixed' && val > 0) {
    discountAmount = val;
  }

  const grandTotal = Math.max(0, subtotal - discountAmount);

  // 4. Procesar Venta
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    setSuccessMessage('');

    try {
      await runTransaction(db, async (transaction) => {
        // A) Leer inventarios actuales de todos los productos involucrados
        const productRefs = new Map(); // id -> { ref, currentStock }
        
        for (const cartItem of cart) {
          if (cartItem.type === 'product') {
            const pid = cartItem.item.id;
            if (!productRefs.has(pid)) {
              const pref = doc(db, 'products', pid);
              const psnap = await transaction.get(pref);
              productRefs.set(pid, { ref: pref, currentStock: psnap.data()?.stock || 0 });
            }
          } else if (cartItem.type === 'kit') {
            for (const comp of cartItem.item.components) {
              const pid = comp.productId;
              if (!productRefs.has(pid)) {
                const pref = doc(db, 'products', pid);
                const psnap = await transaction.get(pref);
                productRefs.set(pid, { ref: pref, currentStock: psnap.data()?.stock || 0 });
              }
            }
          }
        }

        // B) Calcular nuevos stocks
        const stockUpdates = new Map(); // id -> newStock
        for (const [id, data] of productRefs.entries()) {
          stockUpdates.set(id, data.currentStock);
        }

        for (const cartItem of cart) {
          if (cartItem.type === 'product') {
            const pid = cartItem.item.id;
            const current = stockUpdates.get(pid);
            stockUpdates.set(pid, Math.max(0, current - cartItem.quantity));
          } else if (cartItem.type === 'kit') {
            for (const comp of cartItem.item.components) {
              const pid = comp.productId;
              const current = stockUpdates.get(pid);
              const qtyToDeduct = comp.quantity * cartItem.quantity;
              stockUpdates.set(pid, Math.max(0, current - qtyToDeduct));
            }
          }
        }

        // C) Leer y actualizar la Caja Registradora
        const cashRef = doc(db, 'cashRegister', 'config');
        const cashSnap = await transaction.get(cashRef);
        const currentCash = cashSnap.exists() ? (cashSnap.data().currentCash || 0) : 0;

        // D) Aplicar escrituras
        // 1. Actualizar productos
        for (const [id, newStock] of stockUpdates.entries()) {
          transaction.update(productRefs.get(id).ref, { stock: newStock });
        }
        
        // 2. Actualizar caja
        transaction.set(cashRef, { currentCash: currentCash + grandTotal }, { merge: true });

        // 3. Guardar Ticket de Venta
        const salesRef = collection(db, 'sales');
        const saleDoc = doc(salesRef);
        transaction.set(saleDoc, {
          items: cart.map(c => ({
            id: c.item.id,
            name: c.item.name,
            type: c.type,
            quantity: c.quantity,
            unitPrice: c.type === 'kit' ? c.item.salePrice : (c.item.pricing?.baseSalePrice || 0)
          })),
          subtotal,
          discountAmount,
          discountType,
          grandTotal,
          date: serverTimestamp()
        });
      });

      setSuccessMessage('¡Venta completada con éxito!');
      setCart([]);
      setDiscountType('none');
      setDiscountValue('');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error) {
      console.error("Checkout failed: ", error);
      alert('Error procesando la venta. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="pos-view">
      <div className="pos-header">
        <h2 style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingCart size={24} /> Punto de Venta
        </h2>
      </div>

      {successMessage && (
        <div className="alert alert-success animate-fade-in" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={20} /> {successMessage}
        </div>
      )}

      <div className="pos-layout grid grid-cols-12 gap-6">
        
        {/* Lado Izquierdo: Buscador y Lista */}
        <div className="col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-panel card" style={{ padding: '1.5rem', position: 'relative' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <div className="input-with-icon">
                <Search className="icon" size={20} color="var(--accent-primary)" />
                <input 
                  type="text" 
                  className="form-control pos-search" 
                  placeholder="Buscar producto o kit por nombre..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Resultados de búsqueda */}
            {searchTerm && (
              <div className="search-results glass-panel animate-fade-in">
                {searchResults.length === 0 ? (
                  <div style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>No se encontraron coincidencias.</div>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {searchResults.map((res) => (
                      <li key={res.id + res.resultType} className="search-item" onClick={() => addToCart(res)}>
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {res.resultType === 'kit' ? <Package size={16} color="var(--status-warning)" /> : <Tag size={16} color="var(--accent-secondary)" />}
                            {res.name}
                          </strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {res.resultType === 'kit' ? 'Kit / Combo' : `Stock: ${res.stock || 0} pzas`}
                          </div>
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--status-success)' }}>
                          ${res.resultType === 'kit' ? (res.salePrice || 0).toFixed(2) : (res.pricing?.baseSalePrice || 0).toFixed(2)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="glass-panel card" style={{ flex: 1, overflowY: 'auto', minHeight: '300px' }}>
            <h3 style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--glass-border)', margin: 0 }}>Productos en caja</h3>
            {cart.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <ShoppingCart size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                <p>El carrito está vacío</p>
              </div>
            ) : (
              <ul className="cart-list">
                {cart.map((c, i) => {
                  const price = c.type === 'kit' ? c.item.salePrice : (c.item.pricing?.baseSalePrice || 0);
                  return (
                    <li key={i} className="cart-item animate-fade-in">
                      <div className="cart-item-info">
                        <strong>{c.item.name}</strong>
                        <span className="cart-item-type">{c.type === 'kit' ? '📦 Kit' : '🏷️ Producto'} - ${price.toFixed(2)} c/u</span>
                      </div>
                      
                      <div className="qty-controls">
                        <button onClick={() => updateQuantity(i, -1)}>-</button>
                        <span>{c.quantity}</span>
                        <button onClick={() => updateQuantity(i, 1)}>+</button>
                      </div>

                      <div className="cart-item-total">
                        ${(price * c.quantity).toFixed(2)}
                      </div>

                      <button className="icon-btn icon-btn-danger" style={{ padding: '0.4rem' }} onClick={() => removeFromCart(i)}>
                        <Trash2 size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Lado Derecho: Resumen y Cobro */}
        <div className="col-span-5">
          <div className="glass-panel card pos-sidebar" style={{ position: 'sticky', top: '1rem' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px dashed var(--glass-border)', paddingBottom: '1rem' }}>Resumen de Venta</h3>

            <div className="summary-row text-muted">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {/* Descuentos */}
            <div className="discount-section my-4" style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--glass-border)' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Aplicar Descuento (Opcional)</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <select className="form-control" style={{ flex: 1 }} value={discountType} onChange={e => setDiscountType(e.target.value)}>
                  <option value="none">Sin Descuento</option>
                  <option value="percentage">% Porcentaje</option>
                  <option value="fixed">$ Monto Fijo</option>
                </select>
                {discountType !== 'none' && (
                  <input 
                    type="number" 
                    min="0"
                    step={discountType === 'percentage' ? "1" : "0.01"}
                    className="form-control" 
                    style={{ flex: 1 }}
                    placeholder="Valor..."
                    value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                  />
                )}
              </div>
              {discountAmount > 0 && (
                <div className="summary-row text-success" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  <span>Descuento aplicado:</span>
                  <span>- ${discountAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="summary-row grand-total mt-4" style={{ borderTop: '2px solid var(--glass-border)', paddingTop: '1rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
              <span>Total a Cobrar:</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>

            <button 
              className="btn btn-primary mt-6" 
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', justifyContent: 'center' }}
              disabled={cart.length === 0 || isProcessing}
              onClick={handleCheckout}
            >
              {isProcessing ? 'Procesando...' : '💰 Cobrar e Imprimir Venta'}
            </button>
            
            <button 
              className="btn btn-outline mt-3" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => { setCart([]); setDiscountType('none'); setDiscountValue(''); }}
              disabled={cart.length === 0 || isProcessing}
            >
              Cancelar Venta
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
