import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Table, Spinner, Dropdown, Button } from "react-bootstrap";
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
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().role === "admin") {
          setIsAdmin(true);
          fetchOrders(); 
        } else {
          navigate("/");
        }
        setLoading(false);
      });

      return () => unsubscribeFirestore();
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const fetchOrders = () => {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersList);
    });

    return unsubscribe;
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteDoc(doc(db, "orders", orderId));
      } catch (error) {
        console.error("Error deleting order:", error);
      }
    }
  };

  if (loading) {
    return (
      <div className="admin-loader-container">
        <Spinner animation="border" variant="secondary" size="sm" />
        <span className="ms-2 text-muted">Loading System...</span>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">S</div>
          <span className="brand-name">StoreAdmin</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/admin-page" className="nav-item">
            <span className="material-symbols-outlined">dashboard</span> Dashboard
          </Link>
          <Link to="/admin-page/orders" className="nav-item active">
            <span className="material-symbols-outlined">shopping_cart</span> Orders
          </Link>
          <Link to="/admin-page/add-product" className="nav-item">
            <span className="material-symbols-outlined">add_box</span> Add Product
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

      <main className="admin-main">
        <Container fluid className="admin-container">
          <header className="main-header">
            <div className="header-info">
              <h2 className="header-title">Order Management</h2>
              <p className="header-subtitle">Real-time sales tracking and fulfillment</p>
            </div>
            <div className="header-actions">
              <div className="stat-pill">Total: <strong>{orders.length}</strong></div>
              <Button variant="light" onClick={() => window.print()} className="btn-action-custom">
                <span className="material-symbols-outlined">print</span> Print
              </Button>
            </div>
          </header>

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
                    <td>
                      <div className="d-flex flex-column">
                        <span className="order-id-text">#{order.id.substring(0, 8).toUpperCase()}</span>
                        <span className="order-date-text">
                          {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-US') : "—"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="client-info">
                        <div className="d-flex flex-column">
                          <span className="client-phone">{order.phone || "No phone"}</span>
                        </div>
                      </div>
                    </td>
                    <td >
                      <div className="items-info">
                       
                        {order.items?.length || 0} items
                      </div>
                    </td>
                    <td><span className="order-amount">{order.totalAmount || 0} </span></td>
                    <td >
                      <div style={{width:"120px", dsuplay:"flex", justifyContent:"center"}} className={`status-pill ${order.status || 'new'}`}>
                        {order.status === 'processing' ? 'Processing' : 
                         order.status === 'shipped' ? 'Shipped' : 
                         order.status === 'completed' ? 'Completed' : 'New'}
                      </div>
                    </td>
                    <td className="text-end">
  <div className="d-flex justify-content-end gap-2 action-button-group">
    <button 
      onClick={() => handleStatusChange(order.id, 'new')}
      className={`btn-status btn-status-new ${order.status === 'new' ? 'active' : ''}`}
      title="Set New"
    >
      New
    </button>
    <button 
      onClick={() => handleStatusChange(order.id, 'processing')}
      className={`btn-status btn-status-proc ${order.status === 'processing' ? 'active' : ''}`}
      title="Set Processing"
    >
      Proc
    </button>
    <button 
      onClick={() => handleStatusChange(order.id, 'shipped')}
      className={`btn-status btn-status-ship ${order.status === 'shipped' ? 'active' : ''}`}
      title="Set Shipped"
    >
      Ship
    </button>
    <button 
      onClick={() => handleStatusChange(order.id, 'completed')}
      className={`btn-status btn-status-done ${order.status === 'completed' ? 'active' : ''}`}
      title="Complete"
    >
      <span className="material-symbols-outlined">check</span>
    </button>
    
    <div className="button-divider"></div>
    
   
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