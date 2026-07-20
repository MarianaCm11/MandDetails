import { useState, useEffect } from 'react';
import { collection, collectionGroup, getDocs, doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useFirestoreCollection from '../hooks/useFirestoreCollection';
import {
  TrendingUp, DollarSign, Package, AlertTriangle, Wallet,
  ShoppingBag, Truck, HandCoins, BarChart2, RefreshCw
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { data: products, loading: prodsLoading } = useFirestoreCollection('products');
  const { data: debts } = useFirestoreCollection('debts');
  const { data: supplierOrders } = useFirestoreCollection('supplierOrders');
  const { data: customerOrders } = useFirestoreCollection('customerOrders');
  const { data: sales } = useFirestoreCollection('sales');

  const [cashInRegister, setCashInRegister] = useState(0);
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [tempCash, setTempCash] = useState('');

  const [totalInvested, setTotalInvested] = useState(0); // suma de todos los purchaseHistory
  const [totalPurchases, setTotalPurchases] = useState(0); // conteo de compras
  const [totalEarnings, setTotalEarnings] = useState(0); // dinero ganado global
  const [loadingFinancials, setLoadingFinancials] = useState(true);

  // --- Escuchar Caja ---
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'cashRegister', 'config'), (docSnap) => {
      if (docSnap.exists()) setCashInRegister(docSnap.data().currentCash || 0);
    });
    return () => unsub();
  }, []);

  // --- Escuchar Ganancias Globales ---
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'finances', 'earnings'), (docSnap) => {
      if (docSnap.exists()) setTotalEarnings(docSnap.data().totalEarned || 0);
    });
    return () => unsub();
  }, []);

  // --- Sumar historial de compras (collectionGroup) ---
  useEffect(() => {
    const fetchInvested = async () => {
      try {
        const querySnapshot = await getDocs(collectionGroup(db, 'purchaseHistory'));
        let total = 0;
        let count = 0;
        querySnapshot.forEach(doc => {
          total += doc.data().totalCost || 0;
          count++;
        });
        setTotalInvested(total);
        setTotalPurchases(count);
      } catch (error) {
        console.error("Error leyendo historial de compras:", error);
      } finally {
        setLoadingFinancials(false);
      }
    };
    fetchInvested();
  }, []);

  const handleUpdateCash = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'cashRegister', 'config'), { currentCash: Number(tempCash) }, { merge: true });
      setIsEditingCash(false);
    } catch (error) {
      console.error(error);
    }
  };

  if (prodsLoading || loadingFinancials) {
    return (
      <div className="glass-panel card" style={{ textAlign: 'center', padding: '4rem' }}>
        <RefreshCw size={40} style={{ color: 'var(--accent-primary)', marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
        <h3>Cargando dashboard...</h3>
      </div>
    );
  }

  // ============================
  // Cálculos de Inventario
  // ============================
  const activeProducts = products.filter(p => !p.isDeleted);
  const forSaleProducts = activeProducts.filter(p => (p.purpose || 'venta') === 'venta');
  const totalProducts = activeProducts.length;
  const totalPieces = activeProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
  const lowStockProducts = forSaleProducts.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= 3);
  const outOfStockProducts = forSaleProducts.filter(p => (p.stock || 0) === 0);
  const currentInventoryValue = forSaleProducts.reduce((sum, p) => sum + ((p.pricing?.baseSalePrice || 0) * (p.stock || 0)), 0);
  
  // Inversión en inventario activo (últimas compras × stock)
  const activeInvestment = forSaleProducts.reduce((sum, p) => {
    const lastCost = p.metrics?.averageCost || 0;
    return sum + (lastCost * (p.stock || 0));
  }, 0);

  // ============================
  // Cálculos de Ganancias
  // ============================
  const projectedProfit = currentInventoryValue; // valor si se vende todo el stock actual

  // ============================
  // Deudas
  // ============================
  const activeDebts = debts.filter(d => d.status === 'activa');
  const totalDebtPending = activeDebts.reduce((sum, d) => sum + ((d.totalAmount || 0) - (d.paidAmount || 0)), 0);

  // ============================
  // Pedidos a Proveedores
  // ============================
  const pendingOrders = supplierOrders.filter(o => o.status === 'pendiente').length;
  const inTransitOrders = supplierOrders.filter(o => o.status === 'en_transito').length;
  const receivedOrders = supplierOrders.filter(o => o.status === 'recibido').length;

  // ============================
  // Encargos de Clientes
  // ============================
  const pendingDeliveries = customerOrders.filter(o => o.status === 'listo_entrega').length;

  return (
    <div className="dashboard-view">



      {/* ===== SECCIÓN 1: INVENTARIO ===== */}
      <div className="dash-section-title">
        <Package size={20} /> Inventario
      </div>
      <div className="dash-grid-4 mb-6">
        <div className="glass-panel dash-card">
          <div className="dash-icon-wrap blue"><Package size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Productos distintos</span>
            <span className="dash-value">{totalProducts}</span>
          </div>
        </div>
        <div className="glass-panel dash-card">
          <div className="dash-icon-wrap purple"><BarChart2 size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Piezas físicas totales</span>
            <span className="dash-value">{totalPieces}</span>
          </div>
        </div>
        <div className="glass-panel dash-card" style={{ borderColor: lowStockProducts.length > 0 ? 'rgba(245,158,11,0.4)' : undefined }}>
          <div className="dash-icon-wrap" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}><AlertTriangle size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Bajo stock (≤3)</span>
            <span className="dash-value" style={{ color: '#f59e0b' }}>{lowStockProducts.length}</span>
          </div>
        </div>
        <div className="glass-panel dash-card" style={{ borderColor: outOfStockProducts.length > 0 ? 'rgba(239,68,68,0.4)' : undefined }}>
          <div className="dash-icon-wrap" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}><AlertTriangle size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Agotados</span>
            <span className="dash-value" style={{ color: '#ef4444' }}>{outOfStockProducts.length}</span>
          </div>
        </div>
      </div>
      <div className="glass-panel dash-card-wide mb-8">
        <div className="dash-icon-wrap green"><TrendingUp size={20} /></div>
        <div className="dash-info">
          <span className="dash-label">Valor actual del inventario (precio de venta)</span>
          <span className="dash-value text-success">${currentInventoryValue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Solo productos marcados para "Venta".</span>
        </div>
      </div>

      {/* ===== SECCIÓN 2: COMPRAS ===== */}
      <div className="dash-section-title">
        <ShoppingBag size={20} /> Compras
      </div>
      <div className="dash-grid-3 mb-8">
        <div className="glass-panel dash-card">
          <div className="dash-icon-wrap blue"><DollarSign size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Total invertido (histórico)</span>
            <span className="dash-value">${totalInvested.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
        <div className="glass-panel dash-card">
          <div className="dash-icon-wrap purple"><Package size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Número de compras registradas</span>
            <span className="dash-value">{totalPurchases}</span>
          </div>
        </div>
        <div className="glass-panel dash-card">
          <div className="dash-icon-wrap green"><BarChart2 size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Total pedidos a proveedores</span>
            <span className="dash-value">{supplierOrders.length}</span>
          </div>
        </div>
      </div>

      {/* ===== SECCIÓN 3: GANANCIAS ===== */}
      <div className="dash-section-title">
        <TrendingUp size={20} /> Ganancias
      </div>
      <div className="dash-grid-3 mb-8">
        <div className="glass-panel dash-card" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
          <div className="dash-icon-wrap green"><DollarSign size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Dinero Ganado (Total Histórico)</span>
            <span className="dash-value text-success">${totalEarnings.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suma de productos descontados del inventario.</span>
          </div>
        </div>
        <div className="glass-panel dash-card">
          <div className="dash-icon-wrap purple"><TrendingUp size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Ganancia Proyectada (Stock Actual)</span>
            <span className="dash-value">${projectedProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Basado en el precio de venta actual de las piezas físicas.</span>
          </div>
        </div>
      </div>

      {/* ===== SECCIÓN 4: CAJA ===== */}
      <div className="dash-section-title">
        <Wallet size={20} /> Caja
      </div>
      <div className="glass-panel dash-card-wide mb-8" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
        <div className="dash-icon-wrap green"><Wallet size={24} /></div>
        <div className="dash-info" style={{ flex: 1 }}>
          <span className="dash-label">Dinero en Caja (editable)</span>
          {isEditingCash ? (
            <form onSubmit={handleUpdateCash} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                step="0.01"
                className="form-control"
                autoFocus
                style={{ width: '160px', padding: '0.4rem' }}
                value={tempCash}
                onChange={e => setTempCash(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem' }}>Guardar</button>
              <button type="button" className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }} onClick={() => setIsEditingCash(false)}>Cancelar</button>
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
              <span className="dash-value text-success">${cashInRegister.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              <button className="btn btn-outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }} onClick={() => { setTempCash(cashInRegister); setIsEditingCash(true); }}>
                ✎ Editar
              </button>
            </div>
          )}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Actualiza este valor con el dinero físico o en cuenta que tienes disponible.</span>
        </div>
      </div>

      {/* ===== SECCIÓN 5: DEUDAS ===== */}
      <div className="dash-section-title">
        <HandCoins size={20} /> Deudas
      </div>
      <div className="dash-grid-3 mb-8">
        <div className="glass-panel dash-card" style={{ borderColor: totalDebtPending > 0 ? 'rgba(239,68,68,0.3)' : undefined }}>
          <div className="dash-icon-wrap" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}><DollarSign size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Total pendiente por cobrar</span>
            <span className="dash-value" style={{ color: totalDebtPending > 0 ? '#ef4444' : 'inherit' }}>${totalDebtPending.toFixed(2)}</span>
          </div>
        </div>
        <div className="glass-panel dash-card">
          <div className="dash-icon-wrap" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}><HandCoins size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Clientes con deuda activa</span>
            <span className="dash-value">{activeDebts.length}</span>
          </div>
        </div>
        <div className="glass-panel dash-card">
          <div className="dash-icon-wrap green"><HandCoins size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Encargos listos para entregar</span>
            <span className="dash-value">{pendingDeliveries}</span>
          </div>
        </div>
      </div>

      {/* ===== SECCIÓN 6: PEDIDOS ===== */}
      <div className="dash-section-title">
        <Truck size={20} /> Pedidos a Proveedores
      </div>
      <div className="dash-grid-3 mb-8">
        <div className="glass-panel dash-card">
          <div className="dash-icon-wrap" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}><Truck size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Pendientes / realizados</span>
            <span className="dash-value">{pendingOrders}</span>
          </div>
        </div>
        <div className="glass-panel dash-card">
          <div className="dash-icon-wrap blue"><Truck size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">En tránsito</span>
            <span className="dash-value">{inTransitOrders}</span>
          </div>
        </div>
        <div className="glass-panel dash-card">
          <div className="dash-icon-wrap green"><Truck size={20} /></div>
          <div className="dash-info">
            <span className="dash-label">Recibidos</span>
            <span className="dash-value">{receivedOrders}</span>
          </div>
        </div>
      </div>

      {/* Alertas de Bajo Stock */}
      {lowStockProducts.length > 0 && (
        <div className="glass-panel alert-panel animate-fade-in">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', marginBottom: '1rem' }}>
            <AlertTriangle size={20} /> Productos por agotarse
          </h3>
          <div className="table-container">
            <table className="inv-table" style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {lowStockProducts.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span className="category-pill">{p.categoryName || p.category}</span></td>
                    <td style={{ color: '#f59e0b', fontWeight: 700 }}>{p.stock} pzas</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
