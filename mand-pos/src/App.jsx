import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PackageSearch, 
  Tags, 
  Settings, 
  PlusCircle,
  Gem,
  Wifi,
  WifiOff,
  LogOut,
  Truck,
  NotepadText,
  HandCoins,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './App.css';
import ProductCapture from './components/ProductCapture';
import Configuration from './components/Configuration';
import Inventory from './components/Inventory';
import Login from './components/Login';
import Kits from './components/Kits';
import Dashboard from './components/Dashboard';
import SupplierOrders from './components/SupplierOrders';
import CustomerOrders from './components/CustomerOrders';
import Debts from './components/Debts';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventario', icon: PackageSearch },
  { id: 'capture', label: 'Capturar Producto', icon: PlusCircle },
  { id: 'kits', label: 'Gestión de Kits', icon: Tags },
  { id: 'supplier_orders', label: 'Pedidos a Proveedores', icon: Truck },
  { id: 'customer_orders', label: 'Encargos de Clientes', icon: NotepadText },
  { id: 'debts', label: 'Deudas y Abonos', icon: HandCoins },
];

const PAGE_TITLES = {
  dashboard: 'Resumen del Negocio',
  inventory: 'Inventario',
  capture: 'Nuevo Producto',
  kits: 'Kits y Colecciones',
  supplier_orders: 'Gestión de Proveedores',
  customer_orders: 'Encargos de Clientes',
  debts: 'Registro de Deudas',
  config: 'Configuración del Sistema',
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(139,92,246,0.3)', borderTop: '3px solid #8b5cf6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        <span style={{ color: 'var(--text-secondary)' }}>Cargando MAND...</span>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <button 
          className="sidebar-toggle" 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <div className="logo-container" style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', margin: isSidebarCollapsed ? '0 0 3rem 0' : '0 0 3rem 0' }}>
          <div className="logo-icon">
            <Gem size={24} />
          </div>
          <div className="logo-text">MAND</div>
        </div>

        <nav className="nav-links">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <div
              key={id}
              className={`nav-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon className="nav-icon" />
              <span>{label}</span>
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div
            className={`nav-item ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings className="nav-icon" />
            <span>Configuración</span>
          </div>
          <div className="nav-item" onClick={() => signOut(auth)} style={{ color: 'var(--status-error)' }}>
            <LogOut className="nav-icon" />
            <span>Cerrar Sesión</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`main-content ${isSidebarCollapsed ? 'expanded' : ''}`}>
        <header className="topbar">
          <h1 className="page-title">{PAGE_TITLES[activeTab] || 'MAND'}</h1>
          
          <div className="user-profile">
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              color: isOnline ? '#10b981' : '#f59e0b',
              fontSize: '0.85rem', fontWeight: 500,
              padding: '0.25rem 0.75rem',
              background: isOnline ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              borderRadius: '999px'
            }}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'En línea' : 'Modo offline'}
            </div>
            <div className="avatar">M</div>
          </div>
        </header>

        <div className="content-area animate-fade-in">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'capture' && <ProductCapture />}
          {activeTab === 'config' && <Configuration />}
          {activeTab === 'inventory' && <Inventory />}
          {activeTab === 'kits' && <Kits />}
          {activeTab === 'supplier_orders' && <SupplierOrders />}
          {activeTab === 'customer_orders' && <CustomerOrders />}
          {activeTab === 'debts' && <Debts />}
        </div>
      </main>
    </div>
  );
}

export default App;
