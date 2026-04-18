import "./card.css";
import "../styles.css";

import React, { useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import { ProductContext } from "../../Context.jsx";

function Card({ items }) {
  const contextData = useContext(ProductContext);
  const productsFromContext = contextData?.products || [];
  
  const sortedProducts = useMemo(() => {
    const rawProducts = items || productsFromContext;
    
    if (!rawProducts) return [];

    return [...rawProducts].sort((a, b) => {
      const aId = parseInt(b._id?.substring(b._id.length - 6)) || parseInt(a.id) || 0;
      const bId = parseInt(a._id?.substring(a._id.length - 6)) || parseInt(b.id) || 0;
      return aId - bId;
    });
  }, [items, productsFromContext]);

  return (
    <>
      {sortedProducts.length > 0 && sortedProducts.map((product) => {
        const displayImg = 
          product.images && product.images.length > 0
            ? product.images[0].url
            : typeof product.productImg === 'object' && !Array.isArray(product.productImg)
              ? Object.values(product.productImg)[0]
              : Array.isArray(product.productImg) 
                ? product.productImg[0] 
                : product.productImg;

        return (
          <Container key={product._id || product.id}>
            <div className="card">
              <Link to={`/product/${product._id || product.id}`} className="card-link">
                <div className="card-img-wrapper">
                  <img 
                    src={displayImg || "/fallback-image.jpg"} 
                    alt={product.tovarName} 
                    className="card-img" 
                  />
                </div>
                <h2 id="title" className="card-title">{product.tovarName}</h2>
                <p id="type">{product.tovarClass}</p>
                <p id="variable">{product.colors}</p>
                <p id="card-price" className="card-price">
                  {product.discount && product.discount > 0 ? (
                    <>
                      <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '8px' }}>
                        ₴{product.price || product.tovarPrice}
                      </span>
                      <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                        ₴{Math.round((product.price || product.tovarPrice) * (1 - product.discount / 100))}
                      </span>
                    </>
                  ) : (
                    <>₴{product.price || product.tovarPrice}</>
                  )}
                </p>
              </Link>
            </div>
          </Container>
        );
      })}
    </>
  );
}

export default Card;