import "./bag-card.css";
import "../../styles.css";

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import { auth, db } from "../../../server/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

function Bagcard() {
  const navigate = useNavigate();
  const [bagElements, setBagElements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);

        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            // Отримуємо масив і на всякий випадок групуємо його, 
            // щоб не було однакових карток (id + розмір)
            setBagElements(userData.bagElements || []);
          } else {
            setBagElements([]);
          }
          setLoading(false);
        }, (error) => {
          console.error("Помилка Firestore:", error);
          setLoading(false);
        });

        return () => unsubscribeFirestore();
      } else {
        setLoading(false);
        navigate("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  // ФУНКЦІЯ ОНОВЛЕННЯ ТА ВИДАЛЕННЯ
  const updateQuantity = async (index, change) => {
    const user = auth.currentUser;
    if (!user) return;

    // Робимо глибоку копію масиву
    let updatedBag = [...bagElements];
    const currentProduct = { ...updatedBag[index] };
    
    const newCount = (currentProduct.bagProductCount || 1) + change;

    if (newCount > 0) {
      // Оновлюємо кількість
      updatedBag[index] = { ...currentProduct, bagProductCount: newCount };
    } else {
      // ВИДАЛЕННЯ: якщо кількість стає 0, видаляємо елемент за індексом
      updatedBag = updatedBag.filter((_, i) => i !== index);
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        bagElements: updatedBag,
      });
    } catch (error) {
      console.error("Error updating bag:", error);
    }
  };

  // Розрахунок загальної суми кошика (Total)
  const calculateTotal = () => {
    return bagElements.reduce((total, item) => {
      return total + (Number(item.tovarPrice) * (item.bagProductCount || 1));
    }, 0).toFixed(2);
  };

  if (loading) {
    return (
      <Container>
        <div style={{ textAlign: "center", marginTop: "100px" }}>
          <h2>Loading...</h2>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {bagElements.length === 0 ? (
        <div className="bag-page">
          <h2 className="bag-title">Your Bag is Empty</h2>
          <p className="bag-text">Once you add something to your bag — it will appear here.</p>
          <Link to="/" className="bag-link">Continue Shopping</Link>
        </div>
      ) : (
        <div className="bag-content-wrapper" style={{ display: "flex", gap: "20px" }}>
          
          {/* ЛІВА ЧАСТИНА: СПИСОК ТОВАРІВ */}
          <div className="card-container1" style={{ flex: 2 }}>
            
            {bagElements.map((product, index) => (
              <div className="bag-item-row" key={`${product.id}-${product.selectedSize}-${index}`} style={{ borderBottom: "1px solid #e5e5e5", marginBottom: "20px" }}>
                <div className="card1" style={{ display: "flex", gap: "20px", padding: "10px 0" }}>
                  
                  <div className="card-img-wrapper1">
                    <Link to={`/product/${product.id}`}>
                      <img
                        src={product.productImg || "/fallback-image.jpg"}
                        alt={product.tovarName}
                        className="card-img1"
                        style={{ width: "150px", height: "auto" }}
                      />
                    </Link>
                  </div>

                  <div className="info" style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <Link to={`/product/${product.id}`} className="card-link">
                        <h2 className="card-title1">{product.tovarName}</h2>
                      </Link>
                      <p className="card-price">
                        {(Number(product.tovarPrice) * (product.bagProductCount || 1)).toFixed(2)}$
                      </p>
                    </div>
                    
                    <p id="type" style={{ color: "#757575" }}>{product.type}</p>
                    <p id="size">Size: <strong>{product.selectedSize}</strong></p>
                    
                    <div style={{ display: "flex", alignItems: "center", gap: "15px", marginTop: "10px" }}>
                      <span>Quantity: {product.bagProductCount || 1}</span>
                      <div className="quantity-controls">
                        <button className="value-btn" onClick={() => updateQuantity(index, 1)}>+</button>
                        <button className="value-btn" onClick={() => updateQuantity(index, -1)}>−</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ПРАВА ЧАСТИНА: ПІДСУМОК (SUMMARY) */}
          
            <div className="summary-box-v2">
  <h2 className="summary-title">Summary</h2>
  
  <div className="summary-row">
    <span>Subtotal</span>
    <span>{calculateTotal()}$</span>
  </div>
  
  <div className="summary-row">
    <span>Estimated Shipping</span>
    <span className="shipping-free">Free</span>
  </div>
  
  <div className="summary-divider" />
  
  <div className="summary-row total-row">
    <span>Total</span>
    <span className="total-amount">{calculateTotal()}$</span>
  </div>

  <button className="checkout-action-btn" onClick={() => navigate("/checkout")}>
    Checkout
  </button>
  
  <p className="summary-note">Taxes and shipping calculated at checkout</p>
</div>
          

        </div>
      )}
    </Container>
  );
}

export default Bagcard;