import React, { createContext, useState, useEffect } from "react";

import {} from "firebase/firestore";

import axios from "axios";

export const ProductContext = createContext();

const Context = (props) => {

const [products, setProducts] = useState([]);

  useEffect(() => {
    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/products`)
      .then((res) => setProducts(res.data))
      .catch((err) => console.log("Error fetching products:", err));
  }, []);

  return (
    <ProductContext.Provider value={products}>
      {props.children}
    </ProductContext.Provider>
  );
};  

export default Context;