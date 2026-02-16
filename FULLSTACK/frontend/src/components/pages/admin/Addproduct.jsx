import "./admin.css";
import "../../styles.css";

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Container, Row, Col, Form, Button, Spinner, Alert } from "react-bootstrap";
import { auth, db } from "../../../server/firebase.js"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, addDoc, getDocs, query, where, limit, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

function Addproduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [issubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [productData, setProductData] = useState({
    name: "",
    price: "",
    category: "Electronics",
    description: "",
    stock: 1,
    image: null
  });

  const [imagePreview, setImagePreview] = useState(null);

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
        } else {
          const adminQuery = query(collection(db, "users"), where("role", "==", "admin"), limit(1));
          const adminSnap = await getDocs(adminQuery);
          
          if (adminSnap.empty) {
            await setDoc(userDocRef, { role: "admin", email: user.email }, { merge: true });
            setIsAdmin(true);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProductData({ ...productData, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setProductData({ ...productData, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productData.image) {
      setMessage({ type: "danger", text: "Please select an image first." });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const storageRef = ref( `products/${Date.now()}_${productData.image.name}`);
      const uploadTask = await uploadBytesResumable(storageRef, productData.image);
      const downloadURL = await getDownloadURL(uploadTask.ref);

      await addDoc(collection(db, "products"), {
        name: productData.name,
        price: Number(productData.price),
        category: productData.category,
        description: productData.description,
        stock: Number(productData.stock),
        imageUrl: downloadURL,
        createdAt: new Date()
      });

      setMessage({ type: "success", text: "Product added successfully!" });
      
      setProductData({ name: "", price: "", category: "Electronics", description: "", stock: 1, image: null });
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
      
    } catch (error) {
      console.error("Submit error:", error);
      setMessage({ type: "danger", text: "Error while adding product." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center" style={{ height: "100vh" }}>
        <Spinner animation="border" variant="primary" />
        <h4 className="mt-3">Loading permissions...</h4>
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
                <span className="material-symbols-outlined">dashboard</span> Dashboard
              </Link>
              <Link to="/admin-page/orders" className="nav-item">
                <span className="material-symbols-outlined">shopping_cart</span> Orders
              </Link>
              <Link to="/admin-page/add-product" className="nav-item active">
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
          <header className="main-header mb-4">
            <h2 className="fw-bold m-0">Add New Product</h2>
          </header>

          <Row className="justify-content-center">
            <Col lg={11} xl={10}>
              <div className="content-card shadow-sm p-4 bg-white rounded-4">
                {message.text && (
                  <Alert variant={message.type} dismissible onClose={() => setMessage({type: "", text: ""})}>
                    {message.text}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Row className="g-4">
                    <Col md={8}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Product Name</Form.Label>
                        <Form.Control 
                          type="text" name="name" required placeholder="Enter product name..."
                          value={productData.name} onChange={handleInputChange} 
                        />
                      </Form.Group>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Price (₴)</Form.Label>
                            <Form.Control 
                              type="number" name="price" required placeholder="0.00"
                              value={productData.price} onChange={handleInputChange} 
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Stock Quantity</Form.Label>
                            <Form.Control 
                              type="number" name="stock" required 
                              value={productData.stock} onChange={handleInputChange} 
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Category</Form.Label>
                        <Form.Select name="category" value={productData.category} onChange={handleInputChange}>
                          <option>Electronics</option>
                          <option>Clothing</option>
                          <option>Accessories</option>
                          <option>Home & Garden</option>
                        </Form.Select>
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Product Description</Form.Label>
                        <Form.Control 
                          as="textarea" rows={5} name="description" required 
                          placeholder="Describe your product features..."
                          value={productData.description} onChange={handleInputChange} 
                        />
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Product Image</Form.Label>
                        <div className="image-upload-area border rounded-3 p-2 text-center bg-light">
                          {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="img-fluid rounded mb-2 shadow-sm" style={{ maxHeight: "250px" }} />
                          ) : (
                            <div className="upload-placeholder py-5 text-muted">
                              <span className="material-symbols-outlined d-block fs-1">image</span>
                              <span>No file selected</span>
                            </div>
                          )}
                          <Form.Control
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="mt-2"
                          />
                        </div>
                      </Form.Group>
                      
                      <Button 
                        type="submit" 
                        variant="primary" 
                        className="w-100 py-3 mt-3 fw-bold shadow-sm"
                        disabled={issubmitting}
                      >
                        {issubmitting ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Uploading...
                          </>
                        ) : (
                          "Publish Product"
                        )}
                      </Button>
                    </Col>
                  </Row>
                </Form>
              </div>
            </Col>
          </Row>
        </Container>
      </main>
    </div>
  );
}

export default Addproduct;