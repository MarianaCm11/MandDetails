import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Hook personalizado para suscribirse a una colección de Firestore en tiempo real.
 * @param {string} collectionName - Nombre de la colección (ej. 'categories', 'products')
 * @param {string} orderField - Campo por el cual ordenar (opcional)
 * @returns {Object} { data, loading, error }
 */
export default function useFirestoreCollection(collectionName, orderField = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!collectionName) return;

    let q = collection(db, collectionName);
    
    if (orderField) {
      q = query(q, orderBy(orderField));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching collection ${collectionName}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, orderField]);

  return { data, loading, error };
}
