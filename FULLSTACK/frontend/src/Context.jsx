import React, { createContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

// --- CONTEXT INITIALIZATION ---
// Create the context object that will be imported by components to access data
export const ProductContext = createContext();

// Determine the base API URL from environment variables or default to localhost
export const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:4200";

/**
 * Context Provider Component
 * Wraps the entire application (in index.js or App.js) to provide 
 * global access to product data, loading states, and error handling.
 */
const Context = (props) => {
  // --- GLOBAL STATE ---
  const [products, setProducts] = useState([]);    // Array of all products from the DB
  const [loading, setLoading] = useState(true);     // Global loading indicator
  const [error, setError] = useState(null);         // Stores API error messages

  /**
   * fetchProducts Function
   * Fetches the product list from the backend server.
   * Wrapped in useCallback to prevent unnecessary re-renders in components 
   * that might depend on this function.
   */
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${backendUrl}/products`);
      
      // Ensure we always set an array, even if the response is empty
      setProducts(response.data || []);
    } catch (err) {
      console.error("Context Fetch Error:", err);
      setError(err.message);
      setProducts([]); // Clear products if the fetch fails
    } finally {
      setLoading(false);
    }
  }, []); // backendUrl is a constant, so the dependency array is empty

  // Fetch products automatically when the application first loads
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  /**
   * contextValue Object
   * This object contains everything we want to make "public" to other components.
   */
  const contextValue = {
    products,
    loading,
    error,
    refreshProducts: fetchProducts, // Allows components to manually trigger a data refresh
    backendUrl,
  };

  return (
    /* The .Provider component makes 'contextValue' available to any 
       nested component (props.children) that calls useContext(ProductContext)
    */
    <ProductContext.Provider value={contextValue}>
      {props.children}
    </ProductContext.Provider>
  );
};

export default Context;