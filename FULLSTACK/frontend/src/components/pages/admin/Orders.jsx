import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Table, Spinner, Dropdown, Button } from "react-bootstrap";
// --- FIREBASE CONFIGURATION ---
// Ensure these paths match your project structure
import { auth, db } from "../../../server/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, 
  onSnapshot, 
  collection, 
  updateDoc,
  query, 
  orderBy,
  deleteDoc 
} from "firebase/firestore";
import "./admin.css";

function Orders() {
  const navigate = useNavigate();

  // --- STATE MANAGEMENT ---
  const [loading, setLoading] = useState(true);      // Controls the initial full-screen spinner
  const [isAdmin, setIsAdmin] = useState(false);     // Security flag to gate access
  const [orders, setOrders] = useState([]);          // Holds the live stream of order data

  // --- AUTHENTICATION & ROLE GUARD ---
  useEffect(() => {
    // 1. Listen for Auth state (is the user logged in?)
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Redirect to login if session is empty
        navigate("/login");
        return;
      }

      // 2. Reference the user's document in Firestore to check privileges
      const userDocRef = doc(db, "users", user.uid);
      
      // 3. Set up a real-time listener for the user's role
      // This ensures that if an admin's rights are revoked, they are kicked out instantly
      const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().role === "admin") {
          setIsAdmin(true);
          fetchOrders(); // Only fetch sensitive data if the user is verified as admin
        } else {
          // Redirect unauthorized users to the home page
          navigate("/");
        }
        setLoading(false); // Stop loading once the security check is complete
      });

      return () => unsubscribeFirestore();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  // --- DATA FETCHING (REAL-TIME LISTENER) ---
  const fetchOrders = () => {
    const ordersRef = collection(db, "orders");
    // Sort orders by creation date (newest on top)
    const q = query(ordersRef, orderBy("createdAt", "desc"));

    // Set up a listener for the entire orders collection
    // This removes the need for manual "refresh" buttons
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersList);
    });

    return unsubscribe;
  };

  // --- ACTION HANDLERS ---
  
  // Updates specific order status (New -> Processing -> Shipped -> etc.)
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      // updateDoc is non-destructive; it only changes the fields provided
      await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  // Permanently removes an order from Firestore
  const handleDeleteOrder = async (orderId) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
      } catch (error) {
        console.error("Error deleting order:", error);
      }
    }
  };

  // --- CONDITIONAL RENDERING ---

  // Show spinner while checking credentials or loading data
  if (loading) {
    return (
      <div className="admin-loader-container">
        <Spinner animation="border" variant="secondary" size="sm" />
        <span className="ms-2 text-muted">Initializing Admin System...</span>
      </div>
    );
  }

  // Safety net: If not admin, return null to prevent rendering private UI
  if (!isAdmin) return null;

  return (
    <div className="admin-layout">
      {/* --- SIDEBAR NAVIGATION --- */}
      <aside className="admin-sidebar">

              <div className="sidebar-brand">
                <div className="brand-logo">S</div>
                <span className="brand-name">StoreAdmin</span>
              </div>
              
              <nav className="sidebar-nav">
                <Link to="/admin-page" className="nav-item">
                  <span className="material-symbols-outlined">dashboard</span> Dashboard
                </Link>
                <Link to="/admin-page/products" className="nav-item">
                  <span className="material-symbols-outlined">inventory</span> Products
                </Link>
                <Link to="/admin-page/add-product" className="nav-item">
                  <span className="material-symbols-outlined">add_box</span> Add Product
                </Link>
                <Link to="/admin-page/orders" className="nav-item active">
                  <span className="material-symbols-outlined">shopping_cart</span> Orders
                </Link>
                <Link to="/admin-page/users" className="nav-item">
                  <span className="material-symbols-outlined">group</span> Customers
                </Link>
                <div className="nav-divider"></div>
                <Link to="/" className="nav-item exit">
                  <span className="material-symbols-outlined">logout</span> View Site
                </Link>
              </nav>
            </aside>
      

      {/* --- MAIN CONTENT AREA --- */}
      <main className="admin-main">
        <Container fluid className="admin-container">
          
          {/* Header with Stats & Actions */}
          <header className="main-header">
            <div className="header-info">
              <h2 className="header-title">Order Management</h2>
              <p className="header-subtitle">Real-time fulfillment tracking</p>
            </div>
            <div className="header-actions">
              <div className="stat-pill">Total: <strong>{orders.length}</strong></div>
              <Button variant="light" onClick={() => window.print()} className="btn-action-custom">
                <span className="material-symbols-outlined">print</span> Print
              </Button>
            </div>
          </header>

          {/* Orders Table Container */}
          <div className="orders-table-card shadow-sm">
            <Table responsive className="custom-table align-middle">
              <thead>
                <tr>
                  <th>ID & Date</th>
                  <th>Customer</th>
                  <th>Inventory</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="order-row">
                    {/* ID and Formatted Date Column */}
                    <td>
                      <div className="d-flex flex-column">
                        <span className="order-id-text">#{order.id.substring(0, 8).toUpperCase()}</span>
                        <span className="order-date-text">
                          {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-US') : "—"}
                        </span>
                      </div>
                    </td>

                    {/* Customer Info Column */}
                    <td>
                      <div className="client-info">
                        <span className="client-phone">{order.phone || "No phone"}</span>
                      </div>
                    </td>

                    {/* Order Details Column */}
                    <td>
                      <div className="items-info">
                        {order.items?.length || 0} items
                      </div>
                    </td>

                    {/* Financials Column */}
                    <td><span className="order-amount">{order.totalAmount || 0} </span></td>
                    
                    {/* Visual Status Indicator */}
                    <td>
                      <div className={`status-pill ${order.status || 'new'}`}>
                        {(order.status || 'new').toUpperCase()}
                      </div>
                    </td>

                    {/* Quick-Action Controls */}
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-2 action-button-group">
                        {['new', 'processing', 'shipped', 'completed'].map((status) => (
                          <button 
                            key={status}
                            onClick={() => handleStatusChange(order.id, status)}
                            className={`btn-status btn-status-${status.substring(0, 4)} ${order.status === status ? 'active' : ''}`}
                            title={`Set to ${status}`}
                          >
                            {status === 'completed' ? <span className="material-symbols-outlined">check</span> : status.substring(0, 4)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Container>
      </main>
    </div>
  );
}

export default Orders;