import "./admin.css";
import "../../styles.css";

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Row, Col, Table, Spinner } from "react-bootstrap";
import { auth, db } from "../../../server/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, 
  onSnapshot, 
  collection, 
  getDocs, 
  query, 
  where, 
  limit, 
  setDoc,
} from "firebase/firestore";

function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ orders: 0, products: 0, users: 0 });
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        const usersRef = collection(db, "users");
        const adminQuery = query(usersRef, where("role", "==", "admin"), limit(1));
        const adminSnapshot = await getDocs(adminQuery);

        const userDocRef = doc(db, "users", user.uid);

        if (adminSnapshot.empty) {
          await setDoc(userDocRef, { 
            role: "admin", 
            email: user.email,
            createdAt: new Date() 
          }, { merge: true });
          
          setIsAdmin(true);
          await loadDashboardData();
          setLoading(false);
        } else {
          const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().role === "admin") {
              setIsAdmin(true);
              loadDashboardData();
            } else {
              navigate("/");
            }
            setLoading(false);
          }, (err) => {
            console.error("Firestore error:", err);
            setLoading(false);
          });

          return () => unsubscribeFirestore();
        }
      } catch (error) {
        console.error("Initialization error:", error);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const loadDashboardData = async () => {
    try {
      const [ordersSnap, productsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "users"))
      ]);

      setStats({
        orders: ordersSnap.size,
        products: productsSnap.size,
        users: usersSnap.size
      });

      const ordersArray = ordersSnap.docs.map(doc => {
        const data = doc.data();
        
        let safeDate = new Date(); 
        if (data.createdAt?.seconds) {
          safeDate = new Date(data.createdAt.seconds * 1000);
        }

        return {
          id: doc.id,
          customerName: data.contactDetails 
            ? `${data.contactDetails.firstName || ''} ${data.contactDetails.lastName || ''}`.trim() 
            : "Guest",
          customerPhone: data.contactDetails?.phone || "No phone",
          totalAmount: data.total || "0",
          status: data.status || "new",
          itemsCount: data.items?.length || 0,
          date: safeDate 
        };
      })
      .sort((a, b) => b.date - a.date)
      .slice(0, 5); 
      
      setRecentOrders(ordersArray);
    } catch (error) {
      console.error("Data loading error:", error);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center" style={{ height: "100vh" }}>
        <Spinner animation="border" variant="primary" />
        <h4 className="mt-3">Checking Permissions...</h4>
      </Container>
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
          <Link to="/admin-page" className="nav-item active">
            <span className="material-symbols-outlined">dashboard</span> Dashboard
          </Link>
          <Link to="/admin-page/orders" className="nav-item">
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
        <Container fluid className="px-4 py-4">
          <header className="main-header mb-4 d-flex justify-content-end align-items-center">
            <div className="user-profile">
              <img src={`https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff`} alt="avatar" />
            </div>
          </header>

          <section className="welcome-section mb-5">
            <h2 className="fw-bold">Store Analytics</h2>
            <p className="text-muted">Activity overview for the last 24 hours</p>
          </section>

          <Row className="g-4 mb-5">
            <Col xl={3} md={6}>
              <div className="stat-card-v2">
                <div className="stat-icon blue">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <div className="stat-data">
                  <span className="label">Total Orders</span>
                  <h3 className="value">{stats.orders}</h3>
                </div>
              </div>
            </Col>
            <Col xl={3} md={6}>
              <div className="stat-card-v2">
                <div className="stat-icon green">
                  <span className="material-symbols-outlined">package_2</span>
                </div>
                <div className="stat-data">
                  <span className="label">Products</span>
                  <h3 className="value">{stats.products}</h3>
                </div>
              </div>
            </Col>
            <Col xl={3} md={6}>
              <div className="stat-card-v2">
                <div className="stat-icon purple">
                  <span className="material-symbols-outlined">person_add</span>
                </div>
                <div className="stat-data">
                  <span className="label">Users</span>
                  <h3 className="value">{stats.users}</h3>
                </div>
              </div>
            </Col>
            <Col xl={3} md={6}>
              <div className="stat-card-v2 action-card" onClick={() => navigate('/admin-page/add-product')}>
                <div className="stat-icon orange">
                  <span className="material-symbols-outlined">add</span>
                </div>
                <div className="stat-data">
                  <span className="label">Quick Action</span>
                  <h3 className="value">Add Product</h3>
                </div>
              </div>
            </Col>
          </Row>

          <Row className="g-4">
            <Col lg={12}>
              <div className="content-card border-0 shadow-sm">
                <div className="card-header-v2">
                  <h5 className="mb-0">Recent Orders</h5>
                
                </div>
                <div className="p-0">
                  <Table hover responsive className="m-0 custom-table">
                    <thead>
                      <tr>
                        <th>ID & Date</th>
                        <th>Customer</th>
                        <th>Inventory</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.length > 0 ? (
                        recentOrders.map(order => (
                          <tr key={order.id}>
                            <td>
                              <div className="d-flex flex-column">
                                <span className="fw-bold text-primary">#{order.id.substring(0,8).toUpperCase()}</span>
                                <small className="text-muted">
                                  {order.date.toLocaleDateString('en-US')}
                                </small>
                              </div>
                            </td>
                            <td>
                              <div className="d-flex flex-column">
                                <span className="fw-bold">{order.customerName}</span>
                                <small className="text-muted">{order.customerPhone}</small>
                              </div>
                            </td>
                            <td>
                              <span className="text-muted">{order.itemsCount} items</span>
                            </td>
                            <td>
                              <span className="fw-bold">{order.totalAmount} ₴</span>
                            </td>
                            <td>
                               <span className={`badge-status ${order.status}`}>
                                 {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                               </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-4 text-muted">No orders found</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </main>
    </div>
  );
}

export default Admin;