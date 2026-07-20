import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Save, Tag as TagIcon, Calculator, Plus, Trash2, Check, X } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import useFirestoreCollection from '../hooks/useFirestoreCollection';
import './ProductCapture.css';

const STATUSES = [
  { id: 'disponible', label: 'Disponible' },
  { id: 'pedido_pendiente', label: 'Pedido Pendiente' },
  { id: 'apartado', label: 'Apartado' },
  { id: 'deuda', label: 'En Deuda' },
  { id: 'solo_encargo', label: 'Solo por encargo' },
  { id: 'agotado', label: 'Agotado' }
];

const PURPOSES = [
  { id: 'venta', label: 'Para Venta' },
  { id: 'personal', label: 'Uso Personal' },
  { id: 'regalo', label: 'Regalo' }
];

export default function ProductCapture({ editData = null, onClose = null }) {
  const { data: categories } = useFirestoreCollection('categories', 'name');
  const { data: materials } = useFirestoreCollection('materials', 'name');
  const { data: garmentTypes } = useFirestoreCollection('garmentTypes', 'name');
  const { data: brands } = useFirestoreCollection('brands', 'name');
  const { data: detailsOptions } = useFirestoreCollection('detailsOptions', 'name');

  const { register, handleSubmit, watch, reset, control, setValue } = useForm({
    defaultValues: {
      name: '',
      categoryId: '',
      details: '',
      material: '',
      brand: '',
      notes: '',
      tags: '',
      status: 'disponible',
      purpose: 'venta',
      pricing: { originalPrice: '', baseSalePrice: '', promoPrice: '' },
      purchaseCount: 1,
      historicalPurchases: [{ unitCost: '', quantity: '' }],
      stock: '',
      quantityOrdered: '',
      customFields: {},
      // Clothing specific
      clothing: {
        garmentType: '',
        isCurvi: false,
        sizes: [],
        stretch: 'Ninguno',
        transparent: false,
      },
      composition: [{ material: '', percentage: '' }]
    }
  });

  const { fields: compFields, append: appendComp, remove: removeComp } = useFieldArray({ control, name: 'composition' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Inline creation states
  const [showAddBrand, setShowAddBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [showAddDetail, setShowAddDetail] = useState(false);
  const [newDetailName, setNewDetailName] = useState('');

  // Color chip states (independent from react-hook-form)
  const [coloresDisponibles, setColoresDisponibles] = useState([]);
  const [coloresAdquiridos, setColoresAdquiridos] = useState([]);
  const [newColorDisp, setNewColorDisp] = useState('');
  const [newColorAdq, setNewColorAdq] = useState('');
  const [colorUnico, setColorUnico] = useState(false);

  useEffect(() => {
    if (editData && categories.length > 0) {
      reset({
        name: editData.name || '',
        categoryId: editData.categoryId || '',
        details: editData.details || '',
        material: editData.material || '',
        brand: editData.brand || '',
        notes: editData.notes || '',
        tags: (editData.tags || []).join(', '),
        status: editData.status || 'disponible',
        purpose: editData.purpose || 'venta',
        pricing: {
          originalPrice: editData.pricing?.originalPrice || '',
          baseSalePrice: editData.pricing?.baseSalePrice || '',
          promoPrice: editData.pricing?.promoPrice || ''
        },
        purchaseCount: 1,
        historicalPurchases: [{ unitCost: '', quantity: '' }],
        stock: editData.stock || 0,
        quantityOrdered: editData.quantityOrdered || 0,
        customFields: editData.customFieldValues || {},
        clothing: {
          garmentType: editData.clothingDetails?.garmentType || '',
          isCurvi: editData.clothingDetails?.isCurvi || false,
          sizes: (() => {
            const val = editData.clothingDetails?.sizes || [];
            if (typeof editData.clothingDetails?.sizesOrdered === 'string' && editData.clothingDetails.sizesOrdered) {
              return editData.clothingDetails.sizesOrdered.split(',').map(s => s.trim()).filter(Boolean);
            }
            return val;
          })(),
          stretch: editData.clothingDetails?.stretch || 'Ninguno',
          transparent: editData.clothingDetails?.transparent || false,
        },
        composition: (editData.clothingDetails?.composition?.length > 0) 
           ? editData.clothingDetails.composition 
           : [{ material: '', percentage: '' }]
      });
      // Load color arrays from editData
      const disp = editData.coloresDisponibles || [];
      const adq = editData.coloresAdquiridos || [];
      setColoresDisponibles(disp);
      setColoresAdquiridos(adq);
      const isIdentical = disp.length > 0 && disp.length === adq.length && disp.every((val, index) => val === adq[index]);
      setColorUnico(isIdentical);
    }
  }, [editData, categories, reset]);

  const selectedCategoryId = watch('categoryId');
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const isClothing = selectedCategory?.isClothing || false;
  const filteredMaterials = materials.filter(m => m.categoryId === selectedCategoryId);
  const filteredBrands = brands.filter(b => b.categoryId === selectedCategoryId);
  const filteredDetails = detailsOptions?.filter(d => d.categoryId === selectedCategoryId) || [];

  const purchaseCount = Number(watch('purchaseCount')) || 1;

  const handleAddBrandInline = async () => {
    if (!newBrandName.trim() || !selectedCategoryId) return;
    try {
      await addDoc(collection(db, 'brands'), {
        name: newBrandName.trim(),
        categoryId: selectedCategoryId,
        createdAt: serverTimestamp()
      });
      setValue('brand', newBrandName.trim()); // Auto-seleccionar
      setShowAddBrand(false);
      setNewBrandName('');
    } catch (e) {
      alert('Error guardando marca');
    }
  };

  const handleAddMaterialInline = async () => {
    if (!newMaterialName.trim() || !selectedCategoryId) return;
    try {
      await addDoc(collection(db, 'materials'), {
        name: newMaterialName.trim(),
        categoryId: selectedCategoryId,
        createdAt: serverTimestamp()
      });
      setValue('material', newMaterialName.trim()); // Auto-seleccionar
      setShowAddMaterial(false);
      setNewMaterialName('');
    } catch (e) {
      alert('Error guardando material');
    }
  };

  const handleAddDetailInline = async () => {
    if (!newDetailName.trim() || !selectedCategoryId) return;
    try {
      await addDoc(collection(db, 'detailsOptions'), {
        name: newDetailName.trim(),
        categoryId: selectedCategoryId,
        createdAt: serverTimestamp()
      });
      setValue('details', newDetailName.trim()); // Auto-seleccionar
      setShowAddDetail(false);
      setNewDetailName('');
    } catch (e) {
      alert('Error guardando detalle');
    }
  };

  // Color chip helpers
  const addColor = (list, setList, value, setValue) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed || list.map(c => c.toLowerCase()).includes(trimmed)) return false;
    setList(prev => [...prev, value.trim()]);
    return true;
  };
  const removeColor = (list, setList, index) => setList(prev => prev.filter((_, i) => i !== index));

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSuccessMessage('');
    try {
      const tagsArray = data.tags.split(',').map(t => t.trim()).filter(Boolean);
      
      const productData = {
        name: data.name,
        categoryId: data.categoryId,
        categoryName: selectedCategory ? selectedCategory.name : 'Sin categoría',
        details: data.details,
        material: data.material,
        brand: data.brand,
        notes: data.notes,
        tags: tagsArray,
        status: data.status,
        purpose: data.purpose,
        pricing: {
          originalPrice: Number(data.pricing.originalPrice) || 0,
          baseSalePrice: Number(data.pricing.baseSalePrice) || 0,
          promoPrice: Number(data.pricing.promoPrice) || 0
        },
        stock: Number(data.stock) || 0,
        quantityOrdered: Number(data.quantityOrdered) || 0,
        coloresDisponibles: coloresDisponibles,
        coloresAdquiridos: colorUnico ? coloresDisponibles : coloresAdquiridos,
        customFieldValues: data.customFields || {},
      };

      if (!editData) {
        productData.createdAt = serverTimestamp();
      } else {
        productData.updatedAt = serverTimestamp();
      }

      // Clothing details
      if (isClothing) {
        const validComposition = (data.composition || []).filter(c => c.material.trim() && c.percentage);
        productData.clothingDetails = {
          garmentType: data.clothing.garmentType,
          isCurvi: selectedCategory?.name?.toLowerCase().includes('mujer') ? data.clothing.isCurvi : false,
          sizes: data.clothing.sizes || [],
          stretch: data.clothing.stretch,
          transparent: data.clothing.transparent,
          composition: validComposition.map(c => ({ material: c.material, percentage: Number(c.percentage) }))
        };
      }

      if (editData) {
        await updateDoc(doc(db, 'products', editData.id), productData);

        // --- Sincronización automática de Kits ---
        try {
          const kitsSnap = await getDocs(collection(db, 'kits'));
          const updates = [];

          kitsSnap.forEach(kitDoc => {
            const kit = kitDoc.data();
            const comps = kit.components || [];
            const hasProduct = comps.some(c => c.productId === editData.id);

            if (hasProduct) {
              const updatedComponents = comps.map(c => {
                if (c.productId === editData.id) {
                  return {
                    ...c,
                    productName: productData.name,
                    unitSalePrice: productData.pricing?.baseSalePrice || 0
                  };
                }
                return c;
              });

              // Recalcular valores del kit
              const kitRetailValue = updatedComponents.reduce((sum, comp) => sum + (comp.unitSalePrice * comp.quantity), 0);
              const kitTotalCost = updatedComponents.reduce((sum, comp) => sum + ((comp.unitCost || 0) * comp.quantity), 0);
              // Si el precio de venta del kit era el mismo que el valor sugerido anterior, lo actualizamos al nuevo sugerido
              const salePrice = kit.salePrice === kit.kitRetailValue ? kitRetailValue : (kit.salePrice || kitRetailValue);

              updates.push(updateDoc(doc(db, 'kits', kitDoc.id), {
                components: updatedComponents,
                kitRetailValue,
                kitTotalCost,
                salePrice,
                kitUtility: salePrice - kitTotalCost
              }));
            }
          });

          if (updates.length > 0) {
            await Promise.all(updates);
          }
        } catch (syncErr) {
          console.error("Error sincronizando kits:", syncErr);
        }

        setSuccessMessage('¡Producto actualizado exitosamente!');
        setTimeout(() => {
          if (onClose) onClose();
        }, 1500);
      } else {
        const docRef = await addDoc(collection(db, 'products'), productData);

        // Guardar historial de compras basado en "purchaseCount" solo al crear
        const purchasesToSave = Array.from({ length: Math.max(1, Number(data.purchaseCount) || 1) });
        for (let i = 0; i < purchasesToSave.length; i++) {
          const cost = Number(data.historicalPurchases?.[i]?.unitCost) || 0;
          const qty = Number(data.historicalPurchases?.[i]?.quantity) || 1; // Default a 1 pieza si no especifican
          const size = data.historicalPurchases?.[i]?.size || '';
          
          if (cost > 0) {
            await addDoc(collection(db, `products/${docRef.id}/purchaseHistory`), {
              date: serverTimestamp(),
              quantity: qty,
              unitCost: cost,
              totalCost: cost * qty,
              size,
              note: `Compra #${i + 1} registrada al inicio`
            });
          }
        }

        setSuccessMessage('¡Producto guardado exitosamente!');
        reset();
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (error) {
      console.error("Error guardando producto: ", error);
      alert("Hubo un error al guardar. Revisa la consola.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`product-capture glass-panel card ${editData ? 'edit-mode' : ''}`}>
      {successMessage && (
        <div className="alert alert-success animate-fade-in">{successMessage}</div>
      )}

      {editData && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'var(--accent-primary)' }}>Editar Producto</h2>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="capture-form">
        
        {/* SECCIÓN: Selector de Categoría (siempre visible arriba) */}
        <section className="form-section">
          <h3 className="section-title">Categoría de Producto</h3>
          <div className="form-group" style={{ maxWidth: '400px' }}>
            <select 
              className="form-control" 
              required 
              disabled={!!editData} 
              {...register('categoryId')} 
              style={{ fontSize: '1.1rem', padding: '0.75rem', borderColor: 'var(--accent-primary)' }}
            >
              <option value="">-- Selecciona una categoría primero --</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            {editData && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>La categoría no se puede cambiar al editar.</span>}
          </div>
        </section>

        {/* =============== ESQUEMA DE JOYERÍA (PULSERAS, COLLARES, ARETES) =============== */}
        {selectedCategoryId && !isClothing && (
          <section className="form-section animate-fade-in">
            <h3 className="section-title">Información de Joyería ({selectedCategory.name})</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="form-group">
                <label>Nombre *</label>
                <input type="text" className="form-control" placeholder="Ej. Pulsera Cubana" required {...register('name')} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Detalles de Diseño</span>
                  {!showAddDetail && <button type="button" className="icon-btn text-primary" style={{ padding: 0 }} onClick={() => setShowAddDetail(true)}><Plus size={16} /></button>}
                </label>
                {showAddDetail ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="text" className="form-control" placeholder="Nuevo detalle..." value={newDetailName} onChange={e => setNewDetailName(e.target.value)} />
                    <button type="button" className="icon-btn text-success" onClick={handleAddDetailInline}><Check size={18} /></button>
                    <button type="button" className="icon-btn" onClick={() => setShowAddDetail(false)}><X size={18} /></button>
                  </div>
                ) : (
                  <>
                    <select className="form-control" {...register('details')}>
                      <option value="">Sin especificar</option>
                      {filteredDetails.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                    {filteredDetails.length === 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Puedes agregar detalles con el botón +</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Marca / Proveedor</span>
                  {!showAddBrand && <button type="button" className="icon-btn text-primary" style={{ padding: 0 }} onClick={() => setShowAddBrand(true)}><Plus size={16} /></button>}
                </label>
                {showAddBrand ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="text" className="form-control" placeholder="Nueva marca..." value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
                    <button type="button" className="icon-btn text-success" onClick={handleAddBrandInline}><Check size={18} /></button>
                    <button type="button" className="icon-btn" onClick={() => setShowAddBrand(false)}><X size={18} /></button>
                  </div>
                ) : (
                  <>
                    <select className="form-control" {...register('brand')}>
                      <option value="">Sin especificar</option>
                      {filteredBrands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                    {filteredBrands.length === 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Puedes agregar marcas con el botón +</span>
                    )}
                  </>
                )}
              </div>
              <div className="form-group">
                <label>Etiquetas (separadas por coma)</label>
                <div className="input-with-icon">
                  <TagIcon className="icon" size={18} />
                  <input type="text" className="form-control" placeholder="gotico, casual, fresa" {...register('tags')} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Material</span>
                  {!showAddMaterial && <button type="button" className="icon-btn text-primary" style={{ padding: 0 }} onClick={() => setShowAddMaterial(true)}><Plus size={16} /></button>}
                </label>
                {showAddMaterial ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="text" className="form-control" placeholder="Nuevo material..." value={newMaterialName} onChange={e => setNewMaterialName(e.target.value)} />
                    <button type="button" className="icon-btn text-success" onClick={handleAddMaterialInline}><Check size={18} /></button>
                    <button type="button" className="icon-btn" onClick={() => setShowAddMaterial(false)}><X size={18} /></button>
                  </div>
                ) : (
                  <>
                    <select className="form-control" {...register('material')}>
                      <option value="">Sin especificar</option>
                      {filteredMaterials.map(mat => <option key={mat.id} value={mat.name}>{mat.name}</option>)}
                    </select>
                    {filteredMaterials.length === 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Puedes agregar materiales con el botón +</span>
                    )}
                  </>
                )}
              </div>
              <div className="form-group">
                <label>Cantidad Pedida</label>
                <input type="number" className="form-control" min="0" placeholder="Ej. 10" {...register('quantityOrdered')} />
              </div>
              <div className="form-group">
                <label>Stock disponible actualmente *</label>
                <input type="number" className="form-control" min="0" required placeholder="Ej. 10" {...register('stock')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="form-group">
                <label>Estado</label>
                <select className="form-control" {...register('status')}>
                  {STATUSES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Propósito</label>
                <select className="form-control" {...register('purpose')}>
                  {PURPOSES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Opción Color Único */}
            <div style={{ marginBottom: '1rem', marginTop: '1.5rem' }}>
              <label className="checkbox-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={colorUnico}
                  onChange={e => setColorUnico(e.target.checked)}
                />
                <span>Mismo color para Disponibles y Adquiridos (Color Único)</span>
              </label>
            </div>

            {/* Colores - Chip UI */}
            <div className="grid gap-6" style={{ display: 'grid', gridTemplateColumns: colorUnico ? '1fr' : '1fr 1fr' }}>
              {/* Colores Disponibles */}
              <div className="form-group">
                <label>🎨 {colorUnico ? 'Colores del Producto' : 'Colores Disponibles'}</label>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ej. dorado..."
                    value={newColorDisp}
                    onChange={e => setNewColorDisp(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (addColor(coloresDisponibles, setColoresDisponibles, newColorDisp)) setNewColorDisp('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '0.4rem 0.7rem', flexShrink: 0 }}
                    onClick={() => { if(addColor(coloresDisponibles, setColoresDisponibles, newColorDisp)) setNewColorDisp(''); }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: '2rem' }}>
                  {coloresDisponibles.map((c, i) => (
                    <span key={i} className="badge badge-info" style={{ display:'flex', alignItems:'center', gap:'0.3rem', paddingRight:'0.4rem' }}>
                      {c}
                      <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeColor(coloresDisponibles, setColoresDisponibles, i)} />
                    </span>
                  ))}
                  {coloresDisponibles.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin colores aún</span>}
                </div>
              </div>
              {/* Colores Adquiridos */}
              {!colorUnico && (
                <div className="form-group">
                  <label>💜 Colores Adquiridos</label>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. rojo..."
                      value={newColorAdq}
                      onChange={e => setNewColorAdq(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (addColor(coloresAdquiridos, setColoresAdquiridos, newColorAdq)) setNewColorAdq('');
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '0.4rem 0.7rem', flexShrink: 0 }}
                      onClick={() => { if(addColor(coloresAdquiridos, setColoresAdquiridos, newColorAdq)) setNewColorAdq(''); }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: '2rem' }}>
                    {coloresAdquiridos.map((c, i) => (
                      <span key={i} className="badge" style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', display:'flex', alignItems:'center', gap:'0.3rem', paddingRight:'0.4rem' }}>
                        {c}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeColor(coloresAdquiridos, setColoresAdquiridos, i)} />
                      </span>
                    ))}
                    {coloresAdquiridos.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin colores aún</span>}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
        {selectedCategoryId && isClothing && (
          <section className="form-section animate-fade-in" style={{ background: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '1.5rem', borderRadius: 'var(--border-radius-md)' }}>
            <h3 className="section-title" style={{ color: '#3b82f6' }}>Información de Ropa</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="form-group">
                <label>Género</label>
                <input type="text" className="form-control" disabled value={selectedCategory?.name?.toLowerCase().includes('mujer') ? 'Mujer' : 'Hombre'} style={{ background: 'var(--bg-surface-elevated)' }} />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Nombre *</label>
                <input type="text" className="form-control" placeholder="Ej. Blusa de Seda" required {...register('name')} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="form-group">
                <label>Prenda</label>
                <select className="form-control" {...register('clothing.garmentType')}>
                  <option value="">Selecciona prenda...</option>
                  {garmentTypes.map(gt => <option key={gt.id} value={gt.name}>{gt.name}</option>)}
                </select>
              </div>
              {selectedCategory?.name?.toLowerCase().includes('mujer') ? (
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingBottom: '0.2rem' }}>
                  <label className="checkbox-label" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <input type="checkbox" {...register('clothing.isCurvi')} />
                    <span>Diseño Curvi (Sí)</span>
                  </label>
                </div>
              ) : <div></div>}
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Marca / Proveedor</span>
                  {!showAddBrand && <button type="button" className="icon-btn text-primary" style={{ padding: 0 }} onClick={() => setShowAddBrand(true)}><Plus size={16} /></button>}
                </label>
                {showAddBrand ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="text" className="form-control" placeholder="Nueva marca..." value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
                    <button type="button" className="icon-btn text-success" onClick={handleAddBrandInline}><Check size={18} /></button>
                    <button type="button" className="icon-btn" onClick={() => setShowAddBrand(false)}><X size={18} /></button>
                  </div>
                ) : (
                  <>
                    <select className="form-control" {...register('brand')}>
                      <option value="">Sin especificar</option>
                      {filteredBrands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                    {filteredBrands.length === 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Puedes agregar marcas con el botón +</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Etiquetas (separadas por coma)</label>
              <div className="input-with-icon">
                <TagIcon className="icon" size={18} />
                <input type="text" className="form-control" placeholder="gotico, casual..." {...register('tags')} />
              </div>
            </div>

            <hr className="divider" />

            {/* Material y Tallas */}
            <div className="grid grid-cols-2 gap-6">
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label>Material (Composición)</label>
                  <button type="button" className="btn btn-outline" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={() => appendComp({ material: '', percentage: '' })}>
                    <Plus size={14} /> Añadir tela
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {compFields.map((f, idx) => (
                    <div key={f.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input type="text" className="form-control" placeholder="Material (ej. Algodón)" style={{ flex: 2 }} {...register(`composition.${idx}.material`)} />
                      <input type="number" className="form-control" placeholder="%" min="0" max="100" style={{ flex: 1 }} {...register(`composition.${idx}.percentage`)} />
                      <span style={{ color: 'var(--text-muted)' }}>%</span>
                      {compFields.length > 1 && (
                        <button type="button" className="icon-btn icon-btn-danger" onClick={() => removeComp(idx)}><Trash2 size={16} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="form-group">
                  <label>Estiramiento de la Tela</label>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                    <label className="checkbox-label" style={{display:'flex', gap:'0.25rem', alignItems:'center'}}>
                      <input type="radio" value="Ninguno" {...register('clothing.stretch')} /> Ninguno
                    </label>
                    <label className="checkbox-label" style={{display:'flex', gap:'0.25rem', alignItems:'center'}}>
                      <input type="radio" value="Medio" {...register('clothing.stretch')} /> Medio
                    </label>
                    <label className="checkbox-label" style={{display:'flex', gap:'0.25rem', alignItems:'center'}}>
                      <input type="radio" value="Alto" {...register('clothing.stretch')} /> Alto
                    </label>
                  </div>
                </div>
                
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label>Transparente</label>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                    <label className="checkbox-label" style={{display:'flex', gap:'0.25rem', alignItems:'center'}}>
                      <input type="radio" value="true" {...register('clothing.transparent')} /> Sí
                    </label>
                    <label className="checkbox-label" style={{display:'flex', gap:'0.25rem', alignItems:'center'}}>
                      <input type="radio" value="false" {...register('clothing.transparent')} /> No
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkboxes de Tallas */}
            <div className="form-group" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Tallas que maneja este producto</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', background: 'var(--bg-surface-elevated)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--glass-border)' }}>
                {['XXS','XS','S','M','G','XG','XXG','XXXG','4XG+'].map(sz => (
                  <label key={sz} className="checkbox-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', marginRight: '0.5rem' }}>
                    <input type="checkbox" value={sz} {...register('clothing.sizes')} />
                    <span>{sz}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4" style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Cantidad pedida</label>
                <input type="number" className="form-control" min="0" {...register('quantityOrdered')} />
              </div>
              <div className="form-group">
                <label>Stock disponible actualmente *</label>
                <input type="number" className="form-control" min="0" required {...register('stock')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="form-group">
                <label>Estado</label>
                <select className="form-control" {...register('status')}>
                  {STATUSES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Propósito</label>
                <select className="form-control" {...register('purpose')}>
                  {PURPOSES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Colores Ropa */}
            {/* Opción Color Único Ropa */}
            <div style={{ marginBottom: '1rem', marginTop: '1.5rem' }}>
              <label className="checkbox-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={colorUnico}
                  onChange={e => setColorUnico(e.target.checked)}
                />
                <span>Mismo color para Disponibles y Adquiridos (Color Único)</span>
              </label>
            </div>

            {/* Colores Ropa - Chip UI */}
            <div className="grid gap-6" style={{ display: 'grid', gridTemplateColumns: colorUnico ? '1fr' : '1fr 1fr' }}>
              <div className="form-group">
                <label>🎨 {colorUnico ? 'Colores del Producto' : 'Colores Disponibles'}</label>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <input type="text" className="form-control" placeholder="Ej. azul marino..." value={newColorDisp} onChange={e => setNewColorDisp(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if(addColor(coloresDisponibles, setColoresDisponibles, newColorDisp)) setNewColorDisp(''); }}} />
                  <button type="button" className="btn btn-outline" style={{ padding: '0.4rem 0.7rem', flexShrink: 0 }}
                    onClick={() => { if(addColor(coloresDisponibles, setColoresDisponibles, newColorDisp)) setNewColorDisp(''); }}>
                    <Plus size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: '2rem' }}>
                  {coloresDisponibles.map((c, i) => (
                    <span key={i} className="badge badge-info" style={{ display:'flex', alignItems:'center', gap:'0.3rem', paddingRight:'0.4rem' }}>
                      {c} <X size={12} style={{ cursor:'pointer' }} onClick={() => removeColor(coloresDisponibles, setColoresDisponibles, i)} />
                    </span>
                  ))}
                  {coloresDisponibles.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin colores aún</span>}
                </div>
              </div>
              {!colorUnico && (
                <div className="form-group">
                  <label>💜 Colores Adquiridos</label>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <input type="text" className="form-control" placeholder="Ej. rojo..." value={newColorAdq} onChange={e => setNewColorAdq(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if(addColor(coloresAdquiridos, setColoresAdquiridos, newColorAdq)) setNewColorAdq(''); }}} />
                    <button type="button" className="btn btn-outline" style={{ padding: '0.4rem 0.7rem', flexShrink: 0 }}
                      onClick={() => { if(addColor(coloresAdquiridos, setColoresAdquiridos, newColorAdq)) setNewColorAdq(''); }}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: '2rem' }}>
                    {coloresAdquiridos.map((c, i) => (
                      <span key={i} className="badge" style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', display:'flex', alignItems:'center', gap:'0.3rem', paddingRight:'0.4rem' }}>
                        {c} <X size={12} style={{ cursor:'pointer' }} onClick={() => removeColor(coloresAdquiridos, setColoresAdquiridos, i)} />
                      </span>
                    ))}
                    {coloresAdquiridos.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin colores aún</span>}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <hr className="divider" />

        {/* =============== PRECIOS Y COSTOS DE ADQUISICIÓN =============== */}
        {selectedCategoryId && (
          <section className="form-section">
            <div className="section-header">
              <h3 className="section-title">Precios y Costos de Adquisición</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="glass-panel inner-panel">
                <h4 className="panel-subtitle">Precios de Venta</h4>
                <div className="form-group">
                  <label>Precio Original (Etiqueta Proveedor) $</label>
                  <input type="number" step="0.01" className="form-control" placeholder="Ej. 120.00" {...register('pricing.originalPrice')} />
                </div>
                <div className="form-group">
                  <label>Precio de Venta Individual $</label>
                  <input type="number" step="0.01" className="form-control" placeholder="Ej. 150.00" {...register('pricing.baseSalePrice')} />
                </div>
                <div className="form-group">
                  <label>Precio Promoción $ (Si aplica)</label>
                  <input type="number" step="0.01" className="form-control" placeholder="Ej. 135.00" {...register('pricing.promoPrice')} />
                </div>
              </div>

              <div className="glass-panel inner-panel" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
                <h4 className="panel-subtitle">Precios Obtenidos (Historial)</h4>
                
                {editData ? (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(139, 92, 246, 0.05)', borderRadius: 'var(--border-radius-sm)' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <strong>Nota:</strong> Para agregar nuevas compras o modificar el historial de costos, guarda los cambios y usa el botón de "Ver detalles" del producto en la tabla del inventario.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Número de veces comprado</label>
                      <input 
                        type="number" 
                        min="1" 
                        className="form-control" 
                        {...register('purchaseCount', { valueAsNumber: true })} 
                        style={{ maxWidth: '150px', fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent-primary)' }}
                      />
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', position: 'sticky', top: 0, background: 'var(--bg-surface)', paddingBottom: '0.5rem', zIndex: 1 }}>
                        <span style={{ width: '30px' }}></span>
                        <span style={{ flex: 1 }}>Costo por pieza $</span>
                        <span style={{ flex: 1 }}>Piezas (Opcional)</span>
                        {isClothing && <span style={{ flex: 1 }}>Talla</span>}
                      </div>
                      {Array.from({ length: Math.max(1, purchaseCount) }).map((_, i) => (
                        <div key={i} className="animate-fade-in" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--accent-primary)', width: '30px' }}>{i + 1}°</span>
                          <input 
                            type="number" 
                            step="0.01" 
                            placeholder="Costo $" 
                            className="form-control" 
                            {...register(`historicalPurchases.${i}.unitCost`)} 
                            style={{ flex: 1.5 }}
                          />
                          <input 
                            type="number" 
                            placeholder="Cant." 
                            className="form-control" 
                            {...register(`historicalPurchases.${i}.quantity`)} 
                            style={{ flex: 1.2 }}
                          />
                          {isClothing && (
                            <select 
                              className="form-control" 
                              {...register(`historicalPurchases.${i}.size`)} 
                              style={{ flex: 1.5 }}
                            >
                              <option value="">Talla (N/A)</option>
                              {['XXS','XS','S','M','G','XG','XXG','XXXG','4XG+'].map(sz => (
                                <option key={sz} value={sz}>{sz}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1.5rem' }}>
                      Estos precios se guardarán en el historial del producto para calcular la inversión.
                    </p>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {selectedCategoryId && (
          <>
            <div className="form-group" style={{ marginTop: '2rem' }}>
              <label>Notas Adicionales</label>
              <textarea className="form-control" rows="2" {...register('notes')}></textarea>
            </div>

            <div className="form-actions">
              {!editData && <button type="button" className="btn btn-outline" onClick={() => reset()}>Limpiar Formulario</button>}
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                <Save size={20} />
                {isSubmitting ? 'Guardando...' : (editData ? 'Guardar Cambios' : 'Guardar Producto')}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
