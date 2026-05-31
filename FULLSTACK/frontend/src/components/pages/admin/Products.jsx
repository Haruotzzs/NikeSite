import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Row, Col, Table, Button, Spinner, Alert } from "react-bootstrap";
// --- FIREBASE & CONFIG IMPORTS ---
import { auth, db } from "../../../server/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where, limit, setDoc } from "firebase/firestore";
import { backendUrl } from "../../../Context.jsx";
import "./admin.css";

function Products() {
  const navigate = useNavigate();

  // --- STATE MANAGEMENT ---
  const [loading, setLoading] = useState(true);      // Controls the initial loading screen
  const [isAdmin, setIsAdmin] = useState(false);     // Security gate for the UI
  const [products, setProducts] = useState([]);      // Array for fetched product data
  const [message, setMessage] = useState({ type: "", text: "" }); // UI feedback (Success/Error)

  // --- AUTHENTICATION & ROLE BOOTSTRAPPING ---
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        // 1. Check if the current user is already an admin
        if (userSnap.exists() && userSnap.data().role === "admin") {
          setIsAdmin(true);
          loadProducts();
        } else {
          // 2. BOOTSTRAP LOGIC: If no admin exists in the system, make this user the first admin
          const adminQuery = query(collection(db, "users"), where("role", "==", "admin"), limit(1));
          const adminSnap = await getDocs(adminQuery);

          if (adminSnap.empty) {
            await setDoc(userDocRef, { role: "admin", email: user.email }, { merge: true });
            setIsAdmin(true);
            loadProducts();
          } else {
            // If an admin exists and it's not this user, block access
            navigate("/");
          }
        }
      } catch (error) {
        console.error("Security check failed:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  // --- API DATA FETCHING ---
  const loadProducts = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/admin/products`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
      setMessage({ type: "danger", text: "Failed to load product catalog" });
    }
  };

  // --- PRODUCT ACTIONS (DELETE/EDIT) ---

  const handleDelete = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`${backendUrl}/api/admin/products/${productId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        // Optimistic UI update: remove from local state immediately
        setProducts(products.filter(p => p._id !== productId));
        setMessage({ type: "success", text: "Product removed successfully" });
      } else {
        setMessage({ type: "danger", text: "Server failed to delete the product" });
      }
    } catch (error) {
      console.error("Delete error:", error);
      setMessage({ type: "danger", text: "Network error during deletion" });
    }
  };

  const handleEdit = (product) => {
    // Navigate to the form page with the product ID as a query parameter
    navigate(`/admin-page/add-product?id=${product._id}`);
  };

  // --- CONDITIONAL RENDERING (LOADER) ---
  if (loading) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center" style={{ height: "100vh" }}>
        <Spinner animation="border" variant="primary" />
        <h4 className="mt-3">Verifying Credentials...</h4>
      </Container>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="admin-layout">
      {/* --- SHARED ADMIN SIDEBAR --- */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">S</div>
          <span className="brand-name">StoreAdmin</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/admin-page" className="nav-item">
            <span className="material-symbols-outlined">dashboard</span> <span>Dashboard</span>
          </Link>
          <Link to="/admin-page/products" className="nav-item active">
            <span className="material-symbols-outlined">inventory</span> <span>Products</span>
          </Link>
          <Link to="/admin-page/add-product" className="nav-item">
            <span className="material-symbols-outlined">add_box</span> <span>Add Product</span>
          </Link>
          <Link to="/admin-page/orders" className="nav-item">
            <span className="material-symbols-outlined">shopping_cart</span> <span>Orders</span>
          </Link>
          <Link to="/admin-page/users" className="nav-item">
            <span className="material-symbols-outlined">group</span> <span>Customers</span>
          </Link>
          <div className="nav-divider"></div>
          <Link to="/" className="nav-item exit">
            <span className="material-symbols-outlined">logout</span> <span>View Site</span>
          </Link>
        </nav>
      </aside>

      {/* --- MAIN PAGE CONTENT --- */}
      <main className="admin-main">
        <Container fluid className="px-4 py-4">
          <Row className="justify-content-center">
            <Col lg={12}>
              <div className="content-card shadow-sm p-4 bg-white" style={{ borderRadius: '15px' }}>
                
                {/* User Alerts */}
                {message.text && (
                  <Alert variant={message.type} dismissible onClose={() => setMessage({type: "", text: ""})}>
                    {message.text}
                  </Alert>
                )}

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h2 style={{ padding: '20px' }}>Product Catalog</h2>
                
                </div>

                {/* --- PRODUCTS TABLE --- */}
                <Table hover responsive className="custom-table align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Sizes</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length > 0 ? (
                      products.map(product => (
                        <tr key={product._id}>
                          <td>
                            <img
                              src={product.images?.[0]?.url || '/placeholder.jpg'}
                              alt="product"
                              style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }}
                            />
                          </td>
                          <td className="fw-semibold">{product.tovarName}</td>
                          <td><span className="badge bg-light text-dark">{product.tovarClass}</span></td>
                          <td>
                            {/* Discount Pricing Logic */}
                            {product.discount > 0 ? (
                              <div className="d-flex flex-column">
                                <small className="text-decoration-line-through text-muted">{product.price} $</small>
                                <span className="text-danger fw-bold">
                                  {Math.round(product.price * (1 - product.discount / 100))}
                                </span>
                              </div>
                            ) : (
                              <span>{product.price} $</span>
                            )}
                          </td>
                          <td>{product.sizes?.join(', ') || 'N/A'}</td>
                          <td className="text-end">
                            <Button 
                              style={{ minWidth: '80px' }}
                              variant="outline-primary"
                              className="me-2"
                              onClick={() => handleEdit(product)}
                            >
                              Edit
                            </Button>
                            <Button 
                              style={{ minWidth: '80px' }}
                              variant="outline-danger"
                              onClick={() => handleDelete(product._id)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-5 text-muted">
                          The catalog is currently empty.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Col>
          </Row>
        </Container>
      </main>
    </div>
  );
}

export default Products;