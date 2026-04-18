import React, { createContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

export const ProductContext = createContext();
export const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:4200";

const Context = (props) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${backendUrl}/products`);
      setProducts(response.data || []);
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Контекст значення з функцією для рефрешу
  const contextValue = {
    products,
    loading,
    error,
    refreshProducts: fetchProducts, // Функція для обновлення
    backendUrl,
  };

  return (
    <ProductContext.Provider value={contextValue}>
      {props.children}
    </ProductContext.Provider>
  );
};

export default Context;