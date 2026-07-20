import { useState } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import useFirestoreCollection from '../hooks/useFirestoreCollection';
import { Plus, Trash2, Edit2, Save, X, Settings2, Tag, Package, Store } from 'lucide-react';
import './CategoriesManager.css';

export default function CategoriesManager() {
  const { data: categories, loading: catsLoading } = useFirestoreCollection('categories', 'name');
  const { data: materials, loading: matsLoading } = useFirestoreCollection('materials', 'name');
  const { data: garmentTypes, loading: garTypesLoading } = useFirestoreCollection('garmentTypes', 'name');
  const { data: brands, loading: brandsLoading } = useFirestoreCollection('brands', 'name');
  const { data: detailsOptions } = useFirestoreCollection('detailsOptions', 'name');
  const { data: products } = useFirestoreCollection('products');

  // --- STATES ---
  const [activePanel, setActivePanel] = useState('categories'); // 'categories' | 'materials' | 'garmentTypes' | 'brands'
  
  // Categories
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatName, setEditCatName] = useState('');

  // Materials
  const [selectedCatId, setSelectedCatId] = useState('');
  const [newMatName, setNewMatName] = useState('');
  const [editingMatId, setEditingMatId] = useState(null);
  const [editMatName, setEditMatName] = useState('');
  const [matUpdateLoading, setMatUpdateLoading] = useState(false);

  // Garment Types (for clothing)
  const [newGarmentType, setNewGarmentType] = useState('');
  const [editingGarId, setEditingGarId] = useState(null);
  const [editGarName, setEditGarName] = useState('');

  // Brands / Providers
  const [newBrandName, setNewBrandName] = useState('');
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [selectedBrandCatId, setSelectedBrandCatId] = useState('');

  // Details
  const [newDetailName, setNewDetailName] = useState('');
  const [editingDetailId, setEditingDetailId] = useState(null);
  const [editDetailName, setEditDetailName] = useState('');
  const [selectedDetailCatId, setSelectedDetailCatId] = useState('');

  // --- CATEGORIES ---
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCatName.trim(),
        customFields: [],
        isClothing: newCatName.toLowerCase().includes('ropa'),
        createdAt: serverTimestamp()
      });
      setNewCatName('');
    } catch (error) { alert('Error creando categoría'); }
  };

  const handleUpdateCategory = async (id) => {
    if (!editCatName.trim()) return;
    try {
      await updateDoc(doc(db, 'categories', id), { name: editCatName.trim() });
      setEditingCatId(null);
    } catch (error) { alert('Error actualizando'); }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('¿Eliminar esta categoría? Los productos vinculados no se borrarán, pero la categoría ya no aparecerá como opción.')) return;
    try { await deleteDoc(doc(db, 'categories', id)); } catch (error) { console.error(error); }
  };

  const handleToggleClothing = async (cat) => {
    try {
      await updateDoc(doc(db, 'categories', cat.id), { isClothing: !cat.isClothing });
    } catch (error) { console.error(error); }
  };

  // Custom Fields (Removed as per user request)

  // --- MATERIALS ---
  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!newMatName.trim() || !selectedCatId) return;
    try {
      await addDoc(collection(db, 'materials'), {
        name: newMatName.trim(),
        categoryId: selectedCatId
      });
      setNewMatName('');
    } catch (error) { alert('Error añadiendo material'); }
  };

  const handleDeleteMaterial = async (id) => {
    try { await deleteDoc(doc(db, 'materials', id)); } catch (error) { console.error(error); }
  };

  const handleUpdateMaterial = async (mat) => {
    if (!editMatName.trim() || editMatName.trim() === mat.name) { setEditingMatId(null); return; }
    const newName = editMatName.trim();
    const oldName = mat.name;
    setMatUpdateLoading(true);
    try {
      // 1. Actualizar el material en la colección
      await updateDoc(doc(db, 'materials', mat.id), { name: newName });
      // 2. Buscar y actualizar todos los productos que usen este material
      const prodSnap = await getDocs(query(collection(db, 'products'), where('material', '==', oldName)));
      const updates = prodSnap.docs.map(d => updateDoc(doc(db, 'products', d.id), { material: newName }));
      await Promise.all(updates);
      setEditingMatId(null);
      if (prodSnap.size > 0) alert(`✅ Material actualizado en ${prodSnap.size} producto(s).`);
    } catch (error) {
      console.error(error);
      alert('Error actualizando material');
    } finally {
      setMatUpdateLoading(false);
    }
  };

  // --- GARMENT TYPES ---
  const handleAddGarmentType = async (e) => {
    e.preventDefault();
    if (!newGarmentType.trim()) return;
    try {
      await addDoc(collection(db, 'garmentTypes'), {
        name: newGarmentType.trim(),
        createdAt: serverTimestamp()
      });
      setNewGarmentType('');
    } catch (error) { alert('Error añadiendo tipo de prenda'); }
  };

  const handleUpdateGarmentType = async (id) => {
    if (!editGarName.trim()) return;
    try {
      await updateDoc(doc(db, 'garmentTypes', id), { name: editGarName.trim() });
      setEditingGarId(null);
    } catch (error) { alert('Error actualizando'); }
  };

  const handleDeleteGarmentType = async (id) => {
    try { await deleteDoc(doc(db, 'garmentTypes', id)); } catch (error) { console.error(error); }
  };

  // --- BRANDS / PROVIDERS ---
  const handleAddBrand = async (e) => {
    e.preventDefault();
    if (!newBrandName.trim() || !selectedBrandCatId) return;
    try {
      await addDoc(collection(db, 'brands'), {
        name: newBrandName.trim(),
        categoryId: selectedBrandCatId,
        createdAt: serverTimestamp()
      });
      setNewBrandName('');
    } catch (error) { alert('Error añadiendo marca/proveedor'); }
  };

  const handleUpdateBrand = async (id) => {
    if (!editBrandName.trim()) return;
    try {
      await updateDoc(doc(db, 'brands', id), { name: editBrandName.trim() });
      setEditingBrandId(null);
    } catch (error) { alert('Error actualizando'); }
  };

  const handleDeleteBrand = async (id) => {
    if (!window.confirm('¿Eliminar esta marca/proveedor?')) return;
    try { await deleteDoc(doc(db, 'brands', id)); } catch (error) { console.error(error); }
  };

  // --- DETAILS ---
  const handleAddDetail = async (e) => {
    e.preventDefault();
    if (!newDetailName.trim() || !selectedDetailCatId) return;
    try {
      await addDoc(collection(db, 'detailsOptions'), {
        name: newDetailName.trim(),
        categoryId: selectedDetailCatId,
        createdAt: serverTimestamp()
      });
      setNewDetailName('');
    } catch (error) { alert('Error añadiendo detalle'); }
  };

  const handleUpdateDetail = async (id) => {
    if (!editDetailName.trim()) return;
    try {
      await updateDoc(doc(db, 'detailsOptions', id), { name: editDetailName.trim() });
      setEditingDetailId(null);
    } catch (error) { alert('Error actualizando'); }
  };

  const handleDeleteDetail = async (id) => {
    if (!window.confirm('¿Eliminar este detalle?')) return;
    try { await deleteDoc(doc(db, 'detailsOptions', id)); } catch (error) { console.error(error); }
  };

  if (catsLoading || matsLoading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>;

  return (
    <div className="categories-manager">
      {/* Sub-tabs */}
      <div className="cat-subtabs">
        <button className={`tab-btn ${activePanel === 'categories' ? 'active' : ''}`} onClick={() => setActivePanel('categories')}>
          <Settings2 size={16} /> Categorías Principales
        </button>
        <button className={`tab-btn ${activePanel === 'materials' ? 'active' : ''}`} onClick={() => setActivePanel('materials')}>
          <Tag size={16} /> Materiales
        </button>
        <button className={`tab-btn ${activePanel === 'garmentTypes' ? 'active' : ''}`} onClick={() => setActivePanel('garmentTypes')}>
          <Package size={16} /> Prendas (Ropa)
        </button>
        <button className={`tab-btn ${activePanel === 'brands' ? 'active' : ''}`} onClick={() => setActivePanel('brands')}>
          <Store size={16} /> Marcas / Prov.
        </button>
        <button className={`tab-btn ${activePanel === 'details' ? 'active' : ''}`} onClick={() => setActivePanel('details')}>
          <Tag size={16} /> Detalles
        </button>
      </div>

      {/* === CATEGORÍAS === */}
      {activePanel === 'categories' && (
        <div>
          <div className="glass-panel inner-panel mb-4">
            <h3 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Administrar Categorías</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Las categorías aparecerán en el formulario de captura. Activa "Ropa" para habilitar campos especiales de tela y tallas.
            </p>

            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Nueva categoría..."
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                <Plus size={18} />
              </button>
            </form>

            <ul className="cat-list">
              {categories.map(cat => (
                <li key={cat.id} className="cat-item">
                  {editingCatId === cat.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1, alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-control"
                        value={editCatName}
                        onChange={e => setEditCatName(e.target.value)}
                        style={{ flex: 1, padding: '0.4rem' }}
                      />
                      <button className="icon-btn text-success" onClick={() => handleUpdateCategory(cat.id)}><Save size={16} /></button>
                      <button className="icon-btn" onClick={() => setEditingCatId(null)}><X size={16} /></button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontWeight: 500, flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {cat.name}
                        {cat.isClothing && <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Ropa</span>}
                      </span>
                      <div className="action-buttons">
                        <button className="icon-btn" title="Es categoría de Ropa" onClick={() => handleToggleClothing(cat)} style={{ color: cat.isClothing ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                          <Package size={16} />
                        </button>
                        <button className="icon-btn" title="Editar Nombre" onClick={() => { setEditingCatId(cat.id); setEditCatName(cat.name); }}>
                          <Edit2 size={16} />
                        </button>
                        <button className="icon-btn icon-btn-danger" onClick={() => handleDeleteCategory(cat.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>


        </div>
      )}

      {/* === MATERIALES === */}
      {activePanel === 'materials' && (
        <div className="glass-panel inner-panel">
          <h3 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Materiales por Categoría</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Selecciona una categoría y administra sus materiales disponibles.
          </p>
          <div className="form-group">
            <select className="form-control" value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)}>
              <option value="">-- Selecciona una categoría --</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          {selectedCatId && (
            <>
              <form onSubmit={handleAddMaterial} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nuevo material..."
                  value={newMatName}
                  onChange={e => setNewMatName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}><Plus size={18} /></button>
              </form>
              <ul className="cat-list">
                {materials.filter(m => m.categoryId === selectedCatId).map(mat => (
                  <li key={mat.id} className="cat-item">
                    {editingMatId === mat.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flex: 1, alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-control"
                          value={editMatName}
                          onChange={e => setEditMatName(e.target.value)}
                          style={{ flex: 1, padding: '0.4rem' }}
                          autoFocus
                        />
                        <button
                          className="icon-btn text-success"
                          onClick={() => handleUpdateMaterial(mat)}
                          disabled={matUpdateLoading}
                          title="Guardar y actualizar en todos los productos"
                        >
                          {matUpdateLoading ? '...' : <Save size={16} />}
                        </button>
                        <button className="icon-btn" onClick={() => setEditingMatId(null)}><X size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontWeight: 500, flex: 1 }}>{mat.name}</span>
                        <div className="action-buttons">
                          <button
                            className="icon-btn"
                            title="Editar (también actualiza en todos los productos)"
                            onClick={() => { setEditingMatId(mat.id); setEditMatName(mat.name); }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button className="icon-btn icon-btn-danger" onClick={() => handleDeleteMaterial(mat.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
                {materials.filter(m => m.categoryId === selectedCatId).length === 0 && (
                  <li className="cat-item" style={{ color: 'var(--text-muted)', justifyContent: 'center' }}>Sin materiales para esta categoría.</li>
                )}
              </ul>
            </>
          )}
        </div>
      )}

      {/* === TIPOS DE PRENDA === */}
      {activePanel === 'garmentTypes' && (
        <div className="glass-panel inner-panel">
          <h3 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Tipos de Prenda</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Estos tipos aparecen en el formulario de captura cuando la categoría es de Ropa.
          </p>
          <form onSubmit={handleAddGarmentType} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. Vestido, Playera, Sudadera..."
              value={newGarmentType}
              onChange={e => setNewGarmentType(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}><Plus size={18} /></button>
          </form>
          <ul className="cat-list">
            {garmentTypes.map(gt => (
              <li key={gt.id} className="cat-item">
                {editingGarId === gt.id ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flex: 1, alignItems: 'center' }}>
                    <input type="text" className="form-control" value={editGarName} onChange={e => setEditGarName(e.target.value)} style={{ flex: 1, padding: '0.4rem' }} />
                    <button className="icon-btn text-success" onClick={() => handleUpdateGarmentType(gt.id)}><Save size={16} /></button>
                    <button className="icon-btn" onClick={() => setEditingGarId(null)}><X size={16} /></button>
                  </div>
                ) : (
                  <>
                    <span style={{ fontWeight: 500, flex: 1 }}>{gt.name}</span>
                    <div className="action-buttons">
                      <button className="icon-btn" onClick={() => { setEditingGarId(gt.id); setEditGarName(gt.name); }}><Edit2 size={16} /></button>
                      <button className="icon-btn icon-btn-danger" onClick={() => handleDeleteGarmentType(gt.id)}><Trash2 size={16} /></button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* === MARCAS / PROVEEDORES === */}
      {activePanel === 'brands' && (
        <div className="glass-panel inner-panel">
          <h3 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Marcas / Proveedores por Categoría</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Selecciona una categoría y administra las marcas o proveedores que correspondan.
          </p>
          <div className="form-group">
            <select className="form-control" value={selectedBrandCatId} onChange={e => setSelectedBrandCatId(e.target.value)}>
              <option value="">-- Selecciona una categoría --</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          {selectedBrandCatId && (
            <>
              <form onSubmit={handleAddBrand} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Shein, MAND, Genérico..."
                  value={newBrandName}
                  onChange={e => setNewBrandName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}><Plus size={18} /></button>
              </form>
              <ul className="cat-list">
                {brands.filter(b => b.categoryId === selectedBrandCatId).map(b => (
                  <li key={b.id} className="cat-item">
                    {editingBrandId === b.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flex: 1, alignItems: 'center' }}>
                        <input type="text" className="form-control" value={editBrandName} onChange={e => setEditBrandName(e.target.value)} style={{ flex: 1, padding: '0.4rem' }} />
                        <button className="icon-btn text-success" onClick={() => handleUpdateBrand(b.id)}><Save size={16} /></button>
                        <button className="icon-btn" onClick={() => setEditingBrandId(null)}><X size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontWeight: 500, flex: 1 }}>{b.name}</span>
                        <div className="action-buttons">
                          <button className="icon-btn" onClick={() => { setEditingBrandId(b.id); setEditBrandName(b.name); }}><Edit2 size={16} /></button>
                          <button className="icon-btn icon-btn-danger" onClick={() => handleDeleteBrand(b.id)}><Trash2 size={16} /></button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
                {brands.filter(b => b.categoryId === selectedBrandCatId).length === 0 && (
                  <li className="cat-item" style={{ color: 'var(--text-muted)', justifyContent: 'center' }}>Sin marcas para esta categoría.</li>
                )}
              </ul>
            </>
          )}
        </div>
      )}

      {/* === DETALLES === */}
      {activePanel === 'details' && (
        <div className="glass-panel inner-panel">
          <h3 style={{ marginBottom: '1rem', color: 'var(--accent-primary)' }}>Detalles por Categoría</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Selecciona una categoría y administra los detalles (ej. formas, texturas, características).
          </p>
          <div className="form-group">
            <select className="form-control" value={selectedDetailCatId} onChange={e => setSelectedDetailCatId(e.target.value)}>
              <option value="">-- Selecciona una categoría --</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          {selectedDetailCatId && (
            <>
              <form onSubmit={handleAddDetail} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej. Forma redonda, Textura lisa..."
                  value={newDetailName}
                  onChange={e => setNewDetailName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}><Plus size={18} /></button>
              </form>
              <ul className="cat-list">
                {detailsOptions?.filter(d => d.categoryId === selectedDetailCatId).map(d => (
                  <li key={d.id} className="cat-item">
                    {editingDetailId === d.id ? (
                      <div style={{ display: 'flex', gap: '0.5rem', flex: 1, alignItems: 'center' }}>
                        <input type="text" className="form-control" value={editDetailName} onChange={e => setEditDetailName(e.target.value)} style={{ flex: 1, padding: '0.4rem' }} />
                        <button className="icon-btn text-success" onClick={() => handleUpdateDetail(d.id)}><Save size={16} /></button>
                        <button className="icon-btn" onClick={() => setEditingDetailId(null)}><X size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontWeight: 500, flex: 1 }}>{d.name}</span>
                        <div className="action-buttons">
                          <button className="icon-btn" onClick={() => { setEditingDetailId(d.id); setEditDetailName(d.name); }}><Edit2 size={16} /></button>
                          <button className="icon-btn icon-btn-danger" onClick={() => handleDeleteDetail(d.id)}><Trash2 size={16} /></button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
                {detailsOptions?.filter(d => d.categoryId === selectedDetailCatId).length === 0 && (
                  <li className="cat-item" style={{ color: 'var(--text-muted)', justifyContent: 'center' }}>Sin detalles para esta categoría.</li>
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
