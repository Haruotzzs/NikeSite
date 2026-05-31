import "./card.css";
import "../styles.css";

import React, { useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import { ProductContext } from "../../Context.jsx";

/**
 * Card Component
 * Displays a list of products in a grid format. 
 * Can accept products as props (items) or use the global context.
 */
function Card({ items }) {
  const contextData = useContext(ProductContext);
  const productsFromContext = contextData?.products || [];
  
  /**
   * sortedProducts Logic
   * We use useMemo to ensure sorting only happens when the data changes.
   * It attempts to extract numeric IDs from MongoDB-style strings (_id) 
   * or standard IDs to keep the layout consistent.
   */
  const sortedProducts = useMemo(() => {
    // If 'items' is passed (e.g., from SearchPage), use it; otherwise use context
    const rawProducts = items || productsFromContext;
    
    if (!rawProducts) return [];

    return [...rawProducts].sort((a, b) => {
      // Sorting logic: pulls the last 6 characters of the MongoDB ID and converts to Int
      const aId = parseInt(b._id?.substring(b._id.length - 6)) || parseInt(a.id) || 0;
      const bId = parseInt(a._id?.substring(a._id.length - 6)) || parseInt(b.id) || 0;
      return aId - bId;
    });
  }, [items, productsFromContext]);

  return (
    <>
      {sortedProducts.length > 0 && sortedProducts.map((product) => {
        
        // --- IMAGE SELECTION LOGIC ---
        // This handles multiple data formats: Cloudinary/Supabase URL objects, 
        // standard arrays, or single string paths.
        const displayImg = 
          product.images && product.images.length > 0
            ? product.images[0].url // Format: { images: [{url: '...'}] }
            : typeof product.productImg === 'object' && !Array.isArray(product.productImg)
              ? Object.values(product.productImg)[0] // Format: { productImg: { 0: 'url' } }
              : Array.isArray(product.productImg) 
                ? product.productImg[0] // Format: [ 'url1', 'url2' ]
                : product.productImg;   // Format: 'url_string'

        return (
          <Container key={product._id || product.id}>
            <div className="card">
              <Link to={`/product/${product._id || product.id}`} className="card-link">
                
                {/* Product Thumbnail */}
                <div className="card-img-wrapper">
                  <img 
                    src={displayImg || "/fallback-image.jpg"} 
                    alt={product.tovarName} 
                    className="card-img" 
                  />
                </div>

                {/* Product Info */}
                <h2 id="title" className="card-title">{product.tovarName}</h2>
                <p id="type">{product.tovarClass}</p>
                <p id="variable">{product.colors}</p>

                {/* --- PRICE & DISCOUNT LOGIC --- */}
                <p id="card-price" className="card-price">
                  {product.discount && product.discount > 0 ? (
                    <>
                      {/* Old Price (Strikethrough) */}
                      <span style={{ textDecoration: 'line-through', color: '#999', marginRight: '8px' }}>
                        ${product.price || product.tovarPrice}
                      </span>
                      {/* Calculated Discount Price */}
                      <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                        ${Math.round((product.price || product.tovarPrice) * (1 - product.discount / 100))}
                      </span>
                    </>
                  ) : (
                    // Regular Price if no discount exists
                    <>${product.price || product.tovarPrice}</>
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