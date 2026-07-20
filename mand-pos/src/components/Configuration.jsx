import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import { Download, Upload, Activity, CheckCircle, XCircle, Database, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function Configuration() {
  const [connectionStatus, setConnectionStatus] = useState('Probando...');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Estado de conexión en tiempo real
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

  // Prueba de Conexión a Firebase
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocs(collection(db, 'products'));
        setConnectionStatus('Conectado exitosamente');
      } catch (error) {
        console.error("Error conectando a Firebase:", error);
        setConnectionStatus('Error de conexión');
      }
    };
    testConnection();
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const data = [];
      
      querySnapshot.forEach((doc) => {
        const p = doc.data();
        data.push({
          ID: doc.id,
          Nombre: p.name || '',
          Categoria: p.categoryName || p.category || '',
          Detalles: p.details || '',
          Material: p.material || '',
          Marca: p.brand || '',
          Estado: p.status || '',
          Propósito: p.purpose || 'venta',
          Etiquetas: p.tags ? p.tags.join(', ') : '',
          'Precio Venta': p.pricing?.baseSalePrice || 0,
          'Precio Promo': p.pricing?.promoPrice || 0,
          'Stock': p.stock || 0,
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
      XLSX.writeFile(workbook, `Inventario_MAND_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (error) {
      console.error("Error exportando:", error);
      alert("Error al exportar. Revisa la consola.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage('Leyendo archivo...');
    setImportProgress({ current: 0, total: 0 });
    
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        setImportProgress({ current: 0, total: data.length });

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const productData = {
            name: row['Nombre'] || row['NOMBRE'] || 'Producto sin nombre',
            categoryName: row['Categoria'] || row['CATEGORIA'] || 'Otros',
            details: row['Detalles'] || '',
            material: row['Material'] || '',
            brand: row['Marca'] || '',
            status: row['Estado'] || 'disponible',
            purpose: row['Propósito'] || 'venta',
            tags: row['Etiquetas'] ? row['Etiquetas'].split(',').map(t => t.trim()) : [],
            pricing: {
              baseSalePrice: Number(row['Precio Venta'] || row['PRECIO'] || 0),
              promoPrice: Number(row['Precio Promo'] || 0),
            },
            stock: Number(row['Stock'] || row['CANTIDAD'] || 0),
            createdAt: serverTimestamp()
          };
          
          await addDoc(collection(db, 'products'), productData);
          setImportProgress({ current: i + 1, total: data.length });
          // Pequeña pausa para que la UI se actualice
          if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        setImportMessage(`¡Importación completada! (${data.length} productos)`);
        setTimeout(() => { setImportMessage(''); setImportProgress({ current: 0, total: 0 }); }, 6000);
        setIsImporting(false);
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("Error importando:", error);
      setImportMessage("Hubo un error al importar.");
      setIsImporting(false);
    } finally {
      e.target.value = null;
    }
  };

  const progressPercent = importProgress.total > 0
    ? Math.round((importProgress.current / importProgress.total) * 100)
    : 0;

  return (
    <div className="configuration-view card glass-panel">
      <h2 style={{ marginBottom: '2rem', color: 'var(--accent-primary)' }}>Ajustes del Sistema</h2>

      <div className="grid grid-cols-2 gap-6">
        
        {/* Panel de Estado del Sistema */}
        <div className="glass-panel inner-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Activity size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem' }}>Estado de Sincronización</h3>
          </div>
          
          {/* Firebase */}
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.75rem', 
            padding: '1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--border-radius-md)', marginBottom: '1rem'
          }}>
            {connectionStatus === 'Conectado exitosamente' ? (
              <CheckCircle color="var(--status-success)" size={24} />
            ) : connectionStatus === 'Probando...' ? (
              <RefreshCw color="var(--status-warning)" size={24} className="spin-icon" />
            ) : (
              <XCircle color="var(--status-error)" size={24} />
            )}
            <div>
              <div style={{ fontWeight: 600 }}>{connectionStatus}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Firebase Firestore</div>
            </div>
          </div>

          {/* Estado Online/Offline */}
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '0.75rem', 
            padding: '1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--border-radius-md)', marginBottom: '1rem'
          }}>
            {isOnline ? (
              <Wifi color="var(--status-success)" size={24} />
            ) : (
              <WifiOff color="var(--status-warning)" size={24} />
            )}
            <div>
              <div style={{ fontWeight: 600 }}>{isOnline ? 'Conexión activa' : 'Modo sin conexión'}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {isOnline 
                  ? 'Los datos se sincronizan en tiempo real con la nube.' 
                  : 'Datos guardados localmente. Se sincronizarán al reconectar.'}
              </div>
            </div>
          </div>

          <div style={{ padding: '0.75rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--accent-primary)' }}>Funcionamiento Offline-First:</strong>{' '}
            MAND guarda todos los datos localmente primero (IndexedDB) y los sincroniza con Firebase automáticamente cuando hay conexión disponible.
          </div>
        </div>

        {/* Panel de Base de Datos / Excel */}
        <div className="glass-panel inner-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Database size={20} color="var(--accent-primary)" />
            <h3 style={{ fontSize: '1.1rem' }}>Importar y Exportar</h3>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Respalda tu inventario a Excel o importa un inventario existente desde un archivo .xlsx.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <button 
              className="btn btn-outline" 
              onClick={handleExport}
              disabled={isExporting}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Download size={18} />
              {isExporting ? 'Generando archivo...' : 'Exportar Inventario a Excel'}
            </button>

            <div style={{ position: 'relative' }}>
              <input 
                type="file" 
                accept=".xlsx, .xls"
                onChange={handleImport}
                disabled={isImporting}
                style={{ 
                  position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: isImporting ? 'not-allowed' : 'pointer', zIndex: 1
                }}
              />
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={isImporting}
              >
                <Upload size={18} />
                {isImporting ? `Cargando... (${importProgress.current}/${importProgress.total})` : 'Importar desde Excel'}
              </button>
            </div>
            
            {/* Barra de progreso de importación */}
            {isImporting && importProgress.total > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                  <span>Importando filas...</span>
                  <span>{progressPercent}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${progressPercent}%`, 
                    background: 'var(--accent-primary)', 
                    transition: 'width 0.2s ease',
                    borderRadius: '3px'
                  }}></div>
                </div>
              </div>
            )}
            
            {importMessage && (
              <div style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--status-success)', marginTop: '0.5rem' }}>
                {importMessage}
              </div>
            )}

            <div style={{ padding: '0.75rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--glass-border)' }}>
              <strong>Formato esperado:</strong> El archivo Excel debe tener columnas:<br />
              Nombre, Categoria, Material, Marca, Estado, Propósito, Precio Venta, Stock.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
