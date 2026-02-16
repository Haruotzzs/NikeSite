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
  setDoc
} from "firebase/firestore";

function Consumers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ orders: 0, products: 0, users: 0 });
  const [usersList, setUsersList] = useState([]);

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

        // Перевірка на першого адміна
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

      const usersArray = usersSnap.docs.map(doc => {
        const data = doc.data();
        
        // Пріоритет: дані з contactDetails, потім корінь документа
        const contact = data.contactDetails || {};
        const addr = data.addressDetails || {};
        
        // Display Name (з Authentication/Firestore)
        const username = data.displayName || "Unknown";

        // Full Name (firstName + lastName)
        const fName = contact.firstName || data.firstName || "";
        const lName = contact.lastName || data.lastName || "";
        const fullName = (fName || lName) ? `${fName} ${lName}`.trim() : "N/A";

        // Формування адреси
        const fullAddress = addr.city 
          ? `${addr.city}, ${addr.street || ''} ${addr.house || ''}${addr.apartment ? '/' + addr.apartment : ''}`
          : "No address";

        return {
          id: doc.id,
          displayName: username,
          fullName: fullName,
          email: contact.email || data.email || "N/A",
          phone: contact.phone || data.phone || "N/A",
          address: fullAddress,
          role: data.role || "customer"
        };
      });
      
      setUsersList(usersArray);
    } catch (error) {
      console.error("Data loading error:", error);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center" style={{ height: "100vh" }}>
        <Spinner animation="border" variant="primary" />
        <h4 className="mt-3">Processing...</h4>
      </Container>
    );
  }

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
          <Link to="/admin-page/orders" className="nav-item">
            <span className="material-symbols-outlined">shopping_cart</span> Orders
          </Link>
          <Link to="/admin-page/add-product" className="nav-item">
            <span className="material-symbols-outlined">add_box</span> Add Product
          </Link>
          <Link to="/admin-page/users" className="nav-item active">
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
          <section className="welcome-section mb-5">
            <h2 className="fw-bold">User Directory</h2>
            <p className="text-muted">Registered customers database</p>
          </section>

          <Row>
            <Col lg={12}>
              <div className="content-card border-0 shadow-sm">
                <div className="p-0">
                  <Table hover responsive className="m-0 custom-table align-middle">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Display Name</th>
                        <th>Contacts</th>
                        <th>Address</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <img 
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName !== "N/A" ? user.fullName : user.displayName)}&background=random&color=fff`} 
                                alt="avatar" className="rounded-circle me-3" style={{ width: "38px" }}
                              />
                              <div className="d-flex flex-column">
                                <span className="fw-bold">{user.fullName}</span>
                                <small className="text-muted" style={{fontSize: '0.7rem'}}>ID: {user.id.substring(0,8)}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark fw-normal" style={{fontSize: '0.9rem'}}>
                              {user.displayName}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex flex-column" style={{ fontSize: '0.85rem' }}>
                              <span>{user.email}</span>
                              <span className="text-primary">{user.phone}</span>
                            </div>
                          </td>
                          <td style={{ maxWidth: '220px' }}>
                            <small className="text-muted" style={{ fontSize: '0.8rem' }}>{user.address}</small>
                          </td>
                          <td>
                            <span className={`badge-status ${user.role === 'admin' ? 'delivered' : 'new'}`}>
                              {(user.role || 'customer').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
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

export default Consumers;