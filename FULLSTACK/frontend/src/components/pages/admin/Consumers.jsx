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

  // ── UI STATE ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);   // blocks render until auth resolves
  const [isAdmin, setIsAdmin] = useState(false);  // gates the whole page

  // ── DATA STATE ────────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ orders: 0, products: 0, users: 0 }); // collection counts
  const [usersList, setUsersList] = useState([]); // normalized user rows for the table

  // ── EFFECT: Firebase Auth Guard ───────────────────────────────────────────
  // onAuthStateChanged fires once on mount with the current user (or null).
  // - No user → redirect to /login
  // - First ever user in DB → bootstrap them as admin
  // - Existing user → listen to their Firestore doc in real-time to check role
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        const usersRef = collection(db, "users");
        const userDocRef = doc(db, "users", user.uid);

        // ── Check if any admin exists in the system at all
        const adminQuery = query(usersRef, where("role", "==", "admin"), limit(1));
        const adminSnapshot = await getDocs(adminQuery);

        if (adminSnapshot.empty) {
          // ── No admin exists yet → bootstrap: promote this first user to admin
          await setDoc(userDocRef, {
            role: "admin",
            email: user.email,
            createdAt: new Date()
          }, { merge: true });

          setIsAdmin(true);
          await loadDashboardData();
          setLoading(false);
        } else {
          // ── Admin exists — subscribe to this user's Firestore doc in real-time.
          // onSnapshot re-fires whenever the doc changes (e.g. role is revoked),
          // so access is re-checked live without needing a page refresh.
          const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().role === "admin") {
              // ── User is an admin → allow access and load data
              setIsAdmin(true);
              loadDashboardData();
            } else {
              // ── Not an admin → deny access immediately
              navigate("/");
            }
            setLoading(false);
          }, (err) => {
            console.error("Firestore error:", err);
            setLoading(false);
          });

          // Cleanup: stop listening to user doc when component unmounts
          return () => unsubscribeFirestore();
        }
      } catch (error) {
        console.error("Initialization error:", error);
        setLoading(false);
      }
    });

    // Cleanup: unsubscribe from auth listener when component unmounts
    return () => unsubscribeAuth();
  }, [navigate]);

  // ── ASYNC: Load dashboard counts and user table data ──────────────────────
  // Fetches orders, products, and users collections in parallel (Promise.all)
  // to minimize total wait time.
  //
  // User normalization strategy:
  //   Firestore user docs may store profile data in two different shapes:
  //     1. Flat root fields:  { firstName, lastName, email, phone }
  //     2. Nested objects:    { contactDetails: { firstName, ... }, addressDetails: { city, ... } }
  //   We check nested first, then fall back to root-level fields.
  const loadDashboardData = async () => {
    try {
      // ── Fetch all three collections simultaneously
      const [ordersSnap, productsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "products")),
        getDocs(collection(db, "users"))
      ]);

      // ── Update stat counters using collection sizes
      setStats({
        orders: ordersSnap.size,
        products: productsSnap.size,
        users: usersSnap.size
      });

      // ── Normalize each user document into a flat row object for the table
      const usersArray = usersSnap.docs.map(doc => {
        const data = doc.data();

        // ── Prefer nested contactDetails/addressDetails, fall back to root fields
        const contact = data.contactDetails || {};
        const addr = data.addressDetails || {};

        // ── Display name: set by Firebase Auth or stored directly in Firestore
        const username = data.displayName || "Unknown";

        // ── Full name: constructed from first + last, with graceful fallback
        const fName = contact.firstName || data.firstName || "";
        const lName = contact.lastName || data.lastName || "";
        const fullName = (fName || lName) ? `${fName} ${lName}`.trim() : "N/A";

        // ── Address: built from city, street, house, and optional apartment number
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
          role: data.role || "customer" // default to customer if role field is missing
        };
      });

      setUsersList(usersArray);
    } catch (error) {
      console.error("Data loading error:", error);
    }
  };

  // ── RENDER GATE ───────────────────────────────────────────────────────────
  // Show spinner while auth + Firestore role check is in progress.
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

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
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
                <Link to="/admin-page/orders" className="nav-item">
                  <span className="material-symbols-outlined">shopping_cart</span> Orders
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
      

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="admin-main">
        <Container fluid className="px-4 py-4">

          {/* Page header */}
          <section className="welcome-section mb-5">
            <h2 className="fw-bold">User Directory</h2>
            <p className="text-muted">Registered customers database</p>
          </section>

          <Row>
            <Col lg={12}>
              <div className="content-card border-0 shadow-sm">
                <div className="p-0">

                  {/* ── USER TABLE ────────────────────────────────────────────
                      Each row is a normalized user object from loadDashboardData.
                      Columns:
                        Customer    — avatar (generated from name via ui-avatars API),
                                      full name, and truncated Firestore doc ID
                        Display Name — username badge (from Firebase Auth / Firestore)
                        Contacts    — email + phone stacked
                        Address     — city, street, house, apartment
                        Role        — admin or customer badge                       */}
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

                          {/* Customer column: avatar + full name + short ID */}
                          <td>
                            <div className="d-flex align-items-center">
                              {/* Avatar generated dynamically from full name or display name.
                                  Falls back to displayName if fullName is "N/A". */}
                              <img
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName !== "N/A" ? user.fullName : user.displayName)}&background=random&color=fff`}
                                alt="avatar"
                                className="rounded-circle me-3"
                                style={{ width: "38px" }}
                              />
                              <div className="d-flex flex-column">
                                <span className="fw-bold">{user.fullName}</span>
                                {/* Show only first 8 chars of the Firestore doc ID for readability */}
                                <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  ID: {user.id.substring(0, 8)}
                                </small>
                              </div>
                            </div>
                          </td>

                          {/* Display Name column */}
                          <td>
                            <span className="badge bg-light text-dark fw-normal" style={{ fontSize: '0.9rem' }}>
                              {user.displayName}
                            </span>
                          </td>

                          {/* Contacts column: email on top, phone below */}
                          <td>
                            <div className="d-flex flex-column" style={{ fontSize: '0.85rem' }}>
                              <span>{user.email}</span>
                              <span className="text-primary">{user.phone}</span>
                            </div>
                          </td>

                          {/* Address column */}
                          <td style={{ maxWidth: '220px' }}>
                            <small className="text-muted" style={{ fontSize: '0.8rem' }}>
                              {user.address}
                            </small>
                          </td>

                          {/* Role column: 'delivered' CSS class for admin, 'new' for customer */}
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