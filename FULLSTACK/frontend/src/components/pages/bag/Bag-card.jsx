import React, { useEffect, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
// --- FIREBASE & CONTEXT IMPORTS ---
import { auth, db } from "../../../server/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ProductContext } from "../../../Context.jsx";
import "./bag-card.css";
import "../../styles.css";

function Bagcard() {
  const navigate = useNavigate();
  
  // Consume the global product catalog from Context
  const contextData = useContext(ProductContext);
  const allProducts = contextData?.products || [];

  // --- STATE MANAGEMENT ---
  const [bagElements, setBagElements] = useState([]);         // Raw data from Firestore (ID, Size, Count)
  const [enrichedBagElements, setEnrichedBagElements] = useState([]); // Merged data (Firestore + Full Product Details)
  const [loading, setLoading] = useState(true);

  // --- AUTHENTICATION & REAL-TIME CART LISTENER ---
  useEffect(() => {
    // Check if a user is logged in
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);

        // Listen to the user's document in real-time
        // This ensures the cart updates instantly if changed on another tab or device
        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            // bagElements typically looks like: [{id: "123", selectedSize: "M", bagProductCount: 2}]
            setBagElements(userData.bagElements || []);
          } else {
            setBagElements([]);
          }
          setLoading(false);
        }, (error) => {
          console.error("Firestore Listener Error:", error);
          setLoading(false);
        });

        return () => unsubscribeFirestore();
      } else {
        // Redirect to login if user session is not found
        setLoading(false);
        navigate("/login");
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  // --- DATA ENRICHMENT LOGIC ---
  // We combine the minimal 'bagElements' from the User Doc 
  // with the full details (Name, Price, Images) from our Product Catalog.
  useEffect(() => {
    const enriched = bagElements.map((bagItem) => {
      // Find the matching product in the global catalog
      const fullProduct = allProducts.find(
        (p) => p._id === bagItem.id || p.id === bagItem.id
      );
      
      return {
        ...bagItem,
        ...fullProduct, // Spread all properties (tovarName, price, etc.) into the bag item
      };
    });

    setEnrichedBagElements(enriched);
  }, [bagElements, allProducts]);

  // --- QUANTITY & DELETION HANDLER ---
  const updateQuantity = async (index, change) => {
    const user = auth.currentUser;
    if (!user) return;

    // Create a mutable copy of the current bag
    let updatedBag = [...bagElements];
    const currentProduct = { ...updatedBag[index] };
    
    // Calculate new count based on the 'change' (+1 or -1)
    const newCount = (currentProduct.bagProductCount || 1) + change;

    if (newCount > 0) {
      // If item still exists, update the count
      updatedBag[index] = { ...currentProduct, bagProductCount: newCount };
    } else {
      // If count hits 0, remove the item from the array entirely
      updatedBag = updatedBag.filter((_, i) => i !== index);
    }

    try {
      const userDocRef = doc(db, "users", user.uid);
      // Sync the updated array back to Firestore
      await updateDoc(userDocRef, {
        bagElements: updatedBag,
      });
    } catch (error) {
      console.error("Failed to sync bag update:", error);
    }
  };

  // --- TOTAL CALCULATION ---
  const calculateSubtotal = () => {
    return enrichedBagElements.reduce((total, item) => {
      
      const price = Number(item.tovarPrice || item.price || 0);
      const quantity = item.bagProductCount || 1;
      return total + (price * quantity);
    }, 0).toFixed(2);
  };
  const calculateTotal = () => {
  return enrichedBagElements.reduce((total, item) => {
    const price = Number(item.tovarPrice || item.price || 0);
    const quantity = item.bagProductCount || 1;
    const discount = Number(item.discount || 0);

    const discountedPrice = price - (price * discount / 100);

    return total + (discountedPrice * quantity);
  }, 0).toFixed(2);
};

  // --- LOADING UI ---
  if (loading) {
    return (
      <Container>
        <div className="text-center mt-5">
          <h2>Synchronizing Bag...</h2>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {enrichedBagElements.length === 0 ? (
        /* EMPTY STATE UI */
        <div className="bag-page">
          <h2 className="bag-title">Your Bag is Empty</h2>
          <p className="bag-text">Once you add something to your bag, it will appear here.</p>
          <Link to="/" className="bag-link">Continue Shopping</Link>
        </div>
      ) : (
        /* POPULATED BAG UI */
        <div className="bag-content-wrapper" style={{ display: "flex", gap: "20px" }}>
          
          {/* LEFT COLUMN: LIST OF PRODUCTS */}
          <div className="card-container1" style={{ flex: 2 }}>
            {enrichedBagElements.map((product, index) => {
              // Handle multiple image object patterns
              const displayImg =
                product.images && product.images.length > 0
                  ? product.images[0].url
                  : product.productImg instanceof Object 
                    ? Object.values(product.productImg)[0]
                    : product.productImg;

              return (
                <div className="bag-item-row" key={`${product.id}-${product.selectedSize}-${index}`} style={{ borderBottom: "1px solid #e5e5e5", marginBottom: "20px" }}>
                  <div className="card1" style={{ display: "flex", gap: "20px", padding: "10px 0" }}>
                    
                    {/* Thumbnail */}
                    <div className="card-img-wrapper1">
                      <Link to={`/product/${product._id || product.id}`}>
                        <img
                          src={displayImg || "/fallback-image.jpg"}
                          alt={product.tovarName}
                          className="card-img1"
                          style={{ width: "150px", height: "auto", borderRadius: "8px" }}
                        />
                      </Link>
                    </div>

                    {/* Product Info */}
                    <div className="info" style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <Link to={`/product/${product._id || product.id}`} className="card-link">
                          <h2 className="card-title1">{product.tovarName}</h2>
                        </Link>
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
                      </div>
                      
                      <p id="type" style={{ color: "#757575" }}>{product.tovarClass}</p>
                      <p id="size">Size: <strong>{product.selectedSize}</strong></p>
                      
                      {/* Quantity Controls */}
                      <div className="d-flex align-items-center gap-3 mt-2">
                        <span>Quantity: {product.bagProductCount || 1}</span>
                        <div className="quantity-controls d-flex gap-2">
                          <button className="value-btn" onClick={() => updateQuantity(index, 1)}>+</button>
                          <button className="value-btn" onClick={() => updateQuantity(index, -1)}>−</button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT COLUMN: SUMMARY & CHECKOUT */}
          <div className="summary-box-v2">
            <h2 className="summary-title">Summary</h2>
            
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{calculateSubtotal()}$</span>
            </div>
            
            <div className="summary-row">
              <span>Estimated Shipping</span>
              <span className="shipping-free text-success">Free</span>
            </div>
            
            <div className="summary-divider" />
            
            <div className="summary-row total-row">
              <span className="fw-bold">Total</span>
              <span className="total-amount fw-bold">{calculateTotal()}$</span>
            </div>

            <button className="checkout-action-btn w-100 mt-3" onClick={() => navigate("/checkout")}>
              Checkout
            </button>
            
            <p className="summary-note text-center mt-2">Taxes and shipping calculated at checkout</p>
          </div>

        </div>
      )}
    </Container>
  );
}

export default Bagcard;