import "./card.css";
import "../styles.css";

import React, { useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import { ProductContext } from "../../Context.jsx";

function Card({ items }) {
  const productsFromContext = useContext(ProductContext);
  
  const sortedProducts = useMemo(() => {
    const rawProducts = items || productsFromContext;
    
    if (!rawProducts) return [];

    return [...rawProducts].sort((a, b) => {
      return parseInt(b.id) - parseInt(a.id);
    });
  }, [items, productsFromContext]);

  return (
    <>
      {sortedProducts.length > 0 && sortedProducts.map((product) => {
        const displayImg = typeof product.productImg === 'object' && !Array.isArray(product.productImg)
          ? Object.values(product.productImg)[0]
          : Array.isArray(product.productImg) 
            ? product.productImg[0] 
            : product.productImg;

        return (
          <Container key={product.id}>
            <div className="card">
              <Link to={`/product/${product.id}`} className="card-link">
                <div className="card-img-wrapper">
                  <img 
                    src={displayImg} 
                    alt={product.tovarName} 
                    className="card-img" 
                  />
                </div>
                <h2 id="title" className="card-title">{product.tovarName}</h2>
                <p id="type">{product.tovarClass}</p>
                <p id="variable">{product.colors}</p>
                <p id="card-price" className="card-price">{product.tovarPrice}$</p>
              </Link>
            </div>
          </Container>
        );
      })}
    </>
  );
}

export default Card;