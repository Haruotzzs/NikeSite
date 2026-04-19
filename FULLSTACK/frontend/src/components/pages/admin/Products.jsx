import "./admin.css";
import "../../styles.css";

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Row, Col, Table, Button, Spinner, Alert } from "react-bootstrap";
import { auth, db } from "../../../server/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where, limit, setDoc } from "firebase/firestore";
import { backendUrl } from "../../../Context.jsx";

function Products() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists() && userSnap.data().role === "admin") {
          setIsAdmin(true);
          loadProducts();
        } else {
          const adminQuery = query(collection(db, "users"), where("role", "==", "admin"), limit(1));
          const adminSnap = await getDocs(adminQuery);

          if (adminSnap.empty) {
            await setDoc(userDocRef, { role: "admin", email: user.email }, { merge: true });
            setIsAdmin(true);
            loadProducts();
          } else {
            navigate("/");
          }
        }
      } catch (error) {
        console.error("Auth error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  const loadProducts = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/admin/products`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
      setMessage({ type: "danger", text: "Failed to load products" });
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`${backendUrl}/api/admin/products/${productId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setProducts(products.filter(p => p._id !== productId));
        setMessage({ type: "success", text: "Product deleted successfully" });
        // Оновлюємо контекст після видалення
        if (window.location.reload) {
          // Можна додати оновлення контексту, але поки що просто перезавантажуємо
        }
      } else {
        setMessage({ type: "danger", text: "Failed to delete product" });
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      setMessage({ type: "danger", text: "Error deleting product" });
    }
  };

  const handleEdit = (product) => {
    navigate(`/admin-page/add-product?id=${product._id}`);
  };

  if (loading) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center" style={{ height: "100vh" }}>
        <Spinner animation="border" variant="primary" />
        <h4 className="mt-3">Loading...</h4>
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

      <main className="admin-main">
        <Container fluid className="px-4 py-4">
          <Row className="justify-content-center">
            <Col lg={12}>
              <div className="content-card" style={{
                background: '#fff',
                borderRadius: '15px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                padding: '30px'
              }}>
                {message.text && (
                  <Alert variant={message.type} dismissible onClose={() => setMessage({type: "", text: ""})}>
                    {message.text}
                  </Alert>
                )}

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h2 className="mb-0">Product Catalog</h2>
                </div>

                <Table hover responsive className="custom-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Sizes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length > 0 ? (
                      products.map(product => (
                        <tr key={product._id}>
                          <td>
                            <img
                              src={product.images && product.images[0] ? product.images[0].url : '/placeholder.jpg'}
                              alt={product.tovarName}
                              style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px' }}
                            />
                          </td>
                          <td>{product.tovarName}</td>
                          <td>{product.tovarClass}</td>
                          <td>
                            {product.discount && product.discount > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ textDecoration: 'line-through', color: '#999', fontSize: '12px' }}>
                                  {product.price} ₴
                                </span>
                                <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                                  {Math.round(product.price * (1 - product.discount / 100))} $
                                </span>
                              </div>
                            ) : (
                              <>{product.price} $</>
                            )}
                          </td>
                          <td>{product.sizes && product.sizes.length > 0 ? product.sizes.join(', ') : 'N/A'}</td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => handleEdit(product)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(product._id)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center py-4 text-muted">
                          No products found
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