import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "../../../../server/firebase.js";

// --- FIREBASE IMPORTS ---
import { onAuthStateChanged } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy 
} from "firebase/firestore";

/**
 * Orders Component
 * Retrieves and displays the order history for the currently logged-in user.
 * Uses real-time listeners to update the UI if the order status changes.
 */
function Orders() {
  // --- STATE MANAGEMENT ---
  const [orders, setOrders] = useState([]);      // List of fetched orders
  const [loading, setLoading] = useState(true);   // Controls the loading spinner
  const [error, setError] = useState(null);       // Stores error messages

  useEffect(() => {
    // 1. Monitor Authentication State
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 2. Define Firestore Query
        // Filters by current user's UID and sorts by creation date (newest first)
        const q = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );

        // 3. Setup Real-time Listener for Orders
        const unsubscribeOrders = onSnapshot(q, (snapshot) => {
          const ordersData = snapshot.docs.map(doc => {
            const data = doc.data();
            
            return {
              id: doc.id,
              ...data,
              // Convert Firebase Timestamp to a readable US-style date string
              formattedDate: data.createdAt?.toDate 
                ? data.createdAt.toDate().toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }) 
                : "Processing..."
            };
          });
          
          setOrders(ordersData);
          setLoading(false);
          setError(null);
        }, (err) => {
          // Handle Firestore permission or network errors
          console.error("Firestore Error:", err);
          setError("Failed to load order history.");
          setLoading(false);
        });

        // Cleanup the Firestore listener when component unmounts or auth changes
        return () => unsubscribeOrders();
      } else {
        // Handle unauthenticated state
        setOrders([]);
        setLoading(false);
      }
    });

    // Cleanup the Auth listener when component unmounts
    return () => unsubscribeAuth();
  }, []);

  // --- UI RENDER: LOADING STATE ---
  if (loading) {
    return (
      <div className="loader-sub" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <div className="spinner-border text-primary" role="status"></div>
        <p style={{ marginTop: '15px', color: '#64748b' }}>Processing order history...</p>
      </div>
    );
  }

  // --- UI RENDER: ERROR STATE ---
  if (error) {
    return (
      <div className="orders-section-wrapper text-center" style={{ padding: '50px 20px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#ef4444' }}>error</span>
        <p style={{ color: '#ef4444', marginTop: '10px' }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="orders-section-wrapper">
      <h2 style={{ marginBottom: '30px', fontWeight: '800', color: '#1e293b' }}>My Orders</h2>

      {/* --- UI RENDER: EMPTY STATE --- */}
      {orders.length === 0 ? (
        <div className="empty-reviews" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '64px', color: '#cbd5e1' }}>
            shopping_bag
          </span>
          <h3 style={{ marginTop: '20px', color: '#334155' }}>You have no orders yet</h3>
          <p style={{ color: '#64748b', marginBottom: '25px' }}>Time to fill your cart with something interesting!</p>
          <Link to="/" className="save-btn-custom" style={{ textDecoration: 'none' }}>
            Continue Shopping
          </Link>
        </div>
      ) : (
        /* --- UI RENDER: ORDERS LIST --- */
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card-modern">
              
              {/* Order Metadata (ID, Date, Status) */}
              <div className="order-header-info">
                <div>
                  {/* Display only the last 8 characters of the order ID for cleaner UI */}
                  <span className="order-id">№ {order.id.slice(-8).toUpperCase()}</span>
                  <div className="review-date-label">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                      calendar_today
                    </span>
                    {order.formattedDate}
                  </div>
                </div>
                {/* Dynamic Status Badge Mapping */}
                <span style={{ paddingTop: '10px' }} className={`order-status-badge ${order.status?.toLowerCase() || 'pending'}`}>
                  {order.status === 'new' ? 'pending' : 
                   order.status === 'shipped' ? 'delivered' : 
                   order.status === 'completed' ? 'completed' : (order.status || 'pending')}
                </span>
              </div>

              {/* Items Preview List */}
              <div className="order-items-preview">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="order-item-row">
                    <img 
                      src={item.productImg} 
                      alt={item.tovarName} 
                      className="order-item-img" 
                    />
                    <div className="order-item-details">
                      <p className="item-name">{item.tovarName}</p>
                      <p className="item-qty">
                        {item.bagProductCount || 1} pcs × {item.tovarPrice} $
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer: Payment Method & Total Price */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
                <div className="order-info-brief">
                  <span className="payment-tag">
                    {order.paymentMethod === 'online' ? (
                      <><span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '5px' }}>credit_card</span> Card payment</>
                    ) : (
                      <><span className="material-symbols-outlined" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '5px' }}>payments</span> Cash on delivery</>
                    )}
                  </span>
                </div>
                <div className="order-total-price">
                  <span className="stat-label">Summary</span>
                  <p>{order.total} $</p>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Orders;