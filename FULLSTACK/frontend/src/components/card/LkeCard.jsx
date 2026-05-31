import "./card.css";
import "../styles.css";

import React, { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Container from "react-bootstrap/Container";
import { ProductContext } from "../../Context.jsx";
import { auth, db } from "../../server/firebase.js"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

function LkeCard() {
  const contextData = useContext(ProductContext);
  const productsFromContext = contextData?.products || [];
  const [likedIds, setLikedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        
        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setLikedIds(userData.likedItems || []);
          }
          setLoading(false);
        }, (error) => {
          console.error("Помилка Firestore:", error);
          setLoading(false);
        });

        return () => unsubscribeFirestore();
      } else {
        setLikedIds([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const likedProducts = productsFromContext.filter((product) => {
    const productId = product._id || product.id;
    return likedIds.includes(productId?.toString()) || likedIds.includes(productId);
  });

  if (loading) return <p style={{ textAlign: "center" }}>Loading Favorites...</p>;

  return (
    <>
      {likedProducts.length > 0 ? (
        likedProducts.map((product) => {
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
        })
      ) : (
        <Container>
          <p style={{ textAlign: "center", marginTop: "20px" }}>
            You haven't liked any items yet.
          </p>
        </Container>
      )}
    </>
  );
}

export default LkeCard;