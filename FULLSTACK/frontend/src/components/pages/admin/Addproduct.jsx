import "./admin.css";
import "../../styles.css";

import React, { useEffect, useState, useContext } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Container, Row, Col, Form, Button, Spinner, Alert } from "react-bootstrap";
import { auth, db } from "../../../server/firebase.js"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where, limit, setDoc } from "firebase/firestore";
import { ProductContext, backendUrl } from "../../../Context.jsx";

function Addproduct() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProducts } = useContext(ProductContext);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [issubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);



const [productData, setProductData] = useState({
  name: "",
  price: "",
  category: "", 
  color: "",
  description: "",
  stock: 1,
  sizes: [],
  variants: [],
  discount: 0,
  images: [] 
});

  const [imagePreviews, setImagePreviews] = useState([]);
  const [showSizesSection, setShowSizesSection] = useState(false);
  const [variantSearchQuery, setVariantSearchQuery] = useState("");
  const [variantSearchResults, setVariantSearchResults] = useState([]);
  const [draggedImageIndex, setDraggedImageIndex] = useState(null);
  const contextData = useContext(ProductContext);
  const allProducts = contextData?.products || [];

  useEffect(() => {
    const productId = searchParams.get('id');
    if (productId) {
      setIsEditing(true);
      setEditingProductId(productId);
      loadProductForEdit(productId);
    }
  }, [searchParams]);

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

  const loadProductForEdit = async (productId) => {
    try {
      const response = await fetch(`${backendUrl}/api/admin/products/${productId}`);
      if (response.ok) {
        const product = await response.json();
        setProductData({
          name: product.tovarName || "",
          price: product.price || "",
          category: product.tovarClass || "",
          color: product.color || product.tovarColor || "",
          description: product.description || "",
          stock: 1,
          sizes: Array.isArray(product.sizes) ? product.sizes : [],
          variants: Array.isArray(product.variants) ? product.variants : [],
          discount: product.discount || 0,
          images: []
        });
        setImagePreviews(product.images ? product.images.map(img => typeof img === 'string' ? img : img.url) : []);
      } else {
        setMessage({ type: "danger", text: "Failed to load product for editing" });
      }
    } catch (error) {
      setMessage({ type: "danger", text: "Error loading product for editing" });
    }
  };

  const handleSizeChange = (size) => {
    setProductData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size) 
        ? prev.sizes.filter(s => s !== size) 
        : [...prev.sizes, size]
    }));
  };

  const handleVariantSearch = (query) => {
    setVariantSearchQuery(query);
    if (query.trim() === "") {
      setVariantSearchResults([]);
      return;
    }
    const results = allProducts.filter(p => 
      p.tovarName?.toLowerCase().includes(query.toLowerCase()) &&
      p.tovarClass === productData.category &&
      !productData.variants.some(v => v.id === p.id || v.id === p._id)
    );
    setVariantSearchResults(results);
  };

  const addVariant = (product) => {
    const variantData = {
      id: product._id || product.id,
      name: product.tovarName,
      mainImage: product.images?.[0]?.url || 
                   (typeof product.productImg === 'object' ? Object.values(product.productImg)[0] : product.productImg),
      price: product.price || product.tovarPrice,
      color: ""
    };
    setProductData(prev => ({
      ...prev,
      variants: [...prev.variants, variantData]
    }));
    setVariantSearchQuery("");
    setVariantSearchResults([]);
  };

  const updateVariantColor = (variantId, newColor) => {
    setProductData(prev => ({
      ...prev,
      variants: prev.variants.map(v => 
        v.id === variantId ? { ...v, color: newColor } : v
      )
    }));
  };

  const removeVariant = (variantId) => {
    setProductData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.id !== variantId)
    }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...(prev || []), ...newPreviews]);
      setProductData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...files]
      }));
    }
  };

  const removeImage = (index) => {
    const updatedPreviews = [...(imagePreviews || [])];
    if (updatedPreviews[index]) {
      URL.revokeObjectURL(updatedPreviews[index]);
    }
    updatedPreviews.splice(index, 1);
    
    const updatedFiles = [...(productData.images || [])];
    updatedFiles.splice(index, 1);

    setImagePreviews(updatedPreviews);
    setProductData({ ...productData, images: updatedFiles });
  };

  const moveImage = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const newPreviews = [...imagePreviews];
      [newPreviews[index], newPreviews[index - 1]] = [newPreviews[index - 1], newPreviews[index]];
      
      const newFiles = [...productData.images];
      [newFiles[index], newFiles[index - 1]] = [newFiles[index - 1], newFiles[index]];
      
      setImagePreviews(newPreviews);
      setProductData({ ...productData, images: newFiles });
    } else if (direction === 'down' && index < imagePreviews.length - 1) {
      const newPreviews = [...imagePreviews];
      [newPreviews[index], newPreviews[index + 1]] = [newPreviews[index + 1], newPreviews[index]];
      
      const newFiles = [...productData.images];
      [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
      
      setImagePreviews(newPreviews);
      setProductData({ ...productData, images: newFiles });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isEditing && productData.images.length === 0) {
      setMessage({ type: "danger", text: "Please select at least one image." });
      return;
    }

    await confirmSubmit();
  };

  const confirmSubmit = async () => {
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const formData = new FormData();
      formData.append("tovarName", productData.name);
      formData.append("tovarClass", productData.category);
      formData.append("price", productData.price);
      formData.append("description", productData.description);
      formData.append("color", productData.color);
      formData.append("tovarColor", productData.color);
      formData.append("sizes", JSON.stringify(productData.sizes));
      formData.append("variants", JSON.stringify(productData.variants));
      formData.append("discount", productData.discount);
      
      if (productData.images && productData.images.length > 0) {
        productData.images.forEach((file) => {
          if (file instanceof File) {
            formData.append("images", file);
          }
        });
      }

      const url = isEditing 
        ? `${backendUrl}/api/admin/products/${editingProductId}`
        : `${backendUrl}/api/admin/products`;
      
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error while saving product");

      setMessage({ type: "success", text: isEditing ? "Product updated successfully!" : "Product added successfully!" });
      
      if (isEditing) {
        if (refreshProducts) {
          refreshProducts();
        }
        navigate("/admin-page/products");
      } else {
        setProductData({ name: "", price: "", category: "", description: "", stock: 1, sizes: [], variants: [], discount: 0, images: [] });
        imagePreviews.forEach(url => URL.revokeObjectURL(url));
        setImagePreviews([]);
        
        if (refreshProducts) {
          refreshProducts();
        }
        navigate("/");
      }
      
    } catch (error) {
      setMessage({ type: "danger", text: error.message || "Server connection error." });
    } finally {
      setIsSubmitting(false);
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

  if (!isAdmin) return null;

  return (
    
    <div className="admin-layout">
      {/* Sidebar залишається як був */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">S</div>
          <span className="brand-name">StoreAdmin</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/admin-page" className="nav-item">
            <span className="material-symbols-outlined">dashboard</span> <span>Dashboard</span>
          </Link>
          <Link to="/admin-page/products" className="nav-item">
            <span className="material-symbols-outlined">inventory</span> <span>Products</span>
          </Link>
          <Link to="/admin-page/add-product" className="nav-item active">
            <span className="material-symbols-outlined">add_box</span> <span>Add Product</span>
          </Link>
          <Link to="/" className="nav-item exit">
            <span className="material-symbols-outlined">logout</span> <span>View Site</span>
          </Link>
        </nav>
      </aside>

      <main className="admin-main">
        <Container fluid className="px-4 py-4">
          

          <Row className="justify-content-center">
            <Col lg={11} xl={10}>
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

                <Form onSubmit={handleSubmit}>
                  <Row className="g-4">
                    {/* LEFT COLUMN: FIELDS */}
                        <Col md={7}>
                          <Form.Group className="mb-4">
                            <Form.Label style={{ 
                              display: 'block', // Фіксує перенос інпуту на новий рядок
                              fontWeight: '600', 
                              marginBottom: '8px', 
                              color: '#555',
                              textAlign: 'left' // Вирівнювання тексту зліва
                            }}>
                              Product Name
                            </Form.Label>
                            <Form.Control 
                              type="text" name="name" required
                              value={productData.name} onChange={handleInputChange} 
                              placeholder="enter"
                              style={{ 
                                width: '100%', 
                                borderRadius: '10px', 
                                padding: '12px', 
                                border: '1px solid #e0e0e0' 
                              }}
                            />
                          </Form.Group>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-4">
                            <Form.Label style={{ display: 'block', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                              Cost ($)
                            </Form.Label>
                            <Form.Control 
                              type="number" name="price" required 
                              value={productData.price} onChange={handleInputChange} 
                              placeholder="0.00"
                              style={{ width: '100%', borderRadius: '10px', padding: '12px' }}
                            />
                          </Form.Group>
                        </Col>
                        
                      </Row>
                        
                      <Form.Group className="mb-4">
                        <Form.Label style={{ display: 'block', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                          Category
                        </Form.Label>
                        <Form.Control 
                          type="text"
                          name="category" 
                          required
                          value={productData.category} 
                          onChange={handleInputChange}
                          placeholder="e.g., Shoes, Pants, Sweaters..."
                          style={{ width: '100%', borderRadius: '10px', padding: '12px', border: '1px solid #e0e0e0' }}
                        />
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Form.Label style={{ display: 'block', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                          Color
                        </Form.Label>
                        <Form.Control 
                          type="text"
                          name="color"
                          value={productData.color}
                          onChange={handleInputChange}
                          placeholder="e.g., Red, Navy, White"
                          style={{ width: '100%', borderRadius: '10px', padding: '12px', border: '1px solid #e0e0e0' }}
                        />
                      </Form.Group>
                        
                      <Form.Group className="mb-4">
                        <Form.Label style={{ display: 'block', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                          Description
                        </Form.Label>
                        <Form.Control 
                          as="textarea" rows={4} name="description" required 
                          placeholder="Describe the product materials, fit, etc..."
                          value={productData.description} onChange={handleInputChange} 
                          style={{ width: '100%', borderRadius: '10px', padding: '12px', resize: 'none' }}
                        />
                      </Form.Group>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-4">
                            <Form.Label style={{ display: 'block', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                              Discount (%)
                            </Form.Label>
                            <Form.Control 
                              type="number" name="discount" min="0" max="100"
                              value={productData.discount} onChange={handleInputChange} 
                              placeholder="0"
                              style={{ width: '100%', borderRadius: '10px', padding: '12px' }}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      <Form.Group className="mb-4">
                        <Form.Label style={{ display: 'block', fontWeight: '600', color: '#555', marginBottom: '12px' }}>
                          Product Variants (Colors/Styles)
                        </Form.Label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          <Form.Control 
                            type="text"
                            placeholder="Search products in this category..."
                            value={variantSearchQuery}
                            onChange={(e) => handleVariantSearch(e.target.value)}
                            style={{ borderRadius: '8px' }}
                          />
                        </div>
                        
                        {variantSearchResults.length > 0 && (
                          <div style={{
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            maxHeight: '250px',
                            overflowY: 'auto',
                            marginBottom: '12px'
                          }}>
                            {variantSearchResults.map(product => (
                              <div
                                key={product._id || product.id}
                                onClick={() => addVariant(product)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '10px',
                                  borderBottom: '1px solid #f0f0f0',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s',
                                  backgroundColor: '#f9f9f9'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                              >
                                <img 
                                  src={product.images?.[0]?.url || 
                                       (typeof product.productImg === 'object' ? Object.values(product.productImg)[0] : product.productImg)} 
                                  alt={product.tovarName}
                                  style={{ width: '40px', height: '40px', borderRadius: '4px', marginRight: '10px', objectFit: 'cover' }}
                                />
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontWeight: '500' }}>{product.tovarName}</p>
                                  <small style={{ color: '#999' }}>${product.price || product.tovarPrice}</small>
                                </div>
                                <span style={{ color: '#007bff', fontWeight: '600' }}>+ Add</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {productData.variants && productData.variants.map((variant) => (
                            <div
                              key={variant.id}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                alignItems: 'center'
                              }}
                            >
                              <div
                                style={{
                                  position: 'relative',
                                  borderRadius: '8px',
                                  border: '2px solid #007bff',
                                  overflow: 'hidden',
                                  width: '80px',
                                  height: '80px',
                                  cursor: 'pointer'
                                }}
                              >
                                <img 
                                  src={variant.mainImage} 
                                  alt={variant.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => removeVariant(variant.id)}
                                  style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    padding: '2px 6px',
                                    borderRadius: '50%',
                                    fontSize: '14px'
                                  }}
                                >
                                  ×
                                </Button>
                                <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 4px', fontSize: '10px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {variant.name}
                                </div>
                              </div>
                              <input
                                type="text"
                                placeholder="Color"
                                value={variant.color || ""}
                                onChange={(e) => updateVariantColor(variant.id, e.target.value)}
                                style={{
                                  width: '80px',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid #ddd',
                                  fontSize: '12px',
                                  textAlign: 'center'
                                }}
                              />
                            </div>
                          ))}
                          {(!productData.variants || productData.variants.length === 0) && (
                            <div style={{ width: '100%', padding: '20px', textAlign: 'center', color: '#999', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                              Search and select product variants
                            </div>
                          )}
                        </div>
                      </Form.Group>

                      <Form.Group className="mb-4">
                        <Button 
                          variant="outline-secondary"
                          onClick={() => setShowSizesSection(!showSizesSection)}
                          style={{ width: '100%', borderRadius: '10px', padding: '10px', fontWeight: '600' }}
                        >
                          {showSizesSection ? '▼ Hide Sizes' : '▶ Show Sizes'}
                        </Button>
                      </Form.Group>

                      {showSizesSection && (
                        <Form.Group className="mb-4">
                          <Form.Label style={{ display: 'block', fontWeight: '600', color: '#555', marginBottom: '8px' }}>
                            Available Sizes
                          </Form.Label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                              <Form.Check
                                key={size}
                                type="checkbox"
                                id={`size-${size}`}
                                label={size}
                                checked={productData.sizes.includes(size)}
                                onChange={() => handleSizeChange(size)}
                                style={{ marginRight: '15px' }}
                              />
                            ))}
                          </div>
                        </Form.Group>
                      )}
                    </Col>

                    {/* RIGHT COLUMN: GALLERY & SUBMIT */}
                    <Col md={5} className="d-flex flex-column">
                      <Form.Group className="mb-4 p-3" style={{ 
                        backgroundColor: '#fcfcfc', 
                        border: '2px dashed #d1d8e0', 
                        borderRadius: '12px' 
                      }}>
                        <Form.Label style={{ padding: '10px', fontWeight: '700', color: '#444' }}>Product Gallery</Form.Label>
                        
                        <div className="image-preview-grid" style={{ minHeight: '160px', marginBottom: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
                          {imagePreviews && imagePreviews.length > 0 ? (
                            imagePreviews.map((url, index) => (
                              <div key={index} className="image-preview-item" style={{ borderRadius: '8px', overflow: 'hidden', position: 'relative', border: index === 0 ? '3px solid gold' : '1px solid #ddd' }}>
                                <img src={url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                {index === 0 && <div style={{ position: 'absolute', top: '4px', left: '4px', backgroundColor: 'gold', color: '#333', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>MAIN</div>}
                                <div style={{ position: 'absolute', bottom: '5px', left: '5px', right: '5px', display: 'flex', gap: '4px' }}>
                                  <Button 
                                    size="sm"
                                    onClick={() => moveImage(index, 'up')}
                                    disabled={index === 0}
                                    style={{ padding: '2px 6px', fontSize: '12px', flex: 1 }}
                                    title="Move up"
                                  >
                                    ↑
                                  </Button>
                                  <Button 
                                    size="sm"
                                    onClick={() => moveImage(index, 'down')}
                                    disabled={index === imagePreviews.length - 1}
                                    style={{ padding: '2px 6px', fontSize: '12px', flex: 1 }}
                                    title="Move down"
                                  >
                                    ↓
                                  </Button>
                                </div>
                                <Button 
                                  className="delete-photo-btn"
                                  variant="danger"
                                  size="sm"
                                  onClick={() => removeImage(index)}
                                  style={{ position: 'absolute', top: '5px', right: '5px', padding: '0 6px', borderRadius: '50%', fontSize: '16px' }}
                                >
                                  ×
                                </Button>
                              </div>
                            ))
                          ) : (
                            <div className="w-100 text-center py-4 text-muted" style={{ gridColumn: '1 / -1' }}>
                              <span className="material-symbols-outlined d-block fs-1">collections</span>
                              <span style={{ fontSize: '0.9rem' }}>No images added yet</span>
                            </div>
                          )}
                        </div>

                        <Form.Control
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageChange}
                          className="mb-2"
                          style={{ fontSize: '0.85rem', width: '100%'}}
                        />
                      
                      </Form.Group>
                      
                      <div className="publish-btn-container mt-auto" style={{ display: 'flex' }}>
                        <Button 
                          type="submit" 
                          variant="primary" 
                          className="py-3 fw-bold" // Прибрав w-100, щоб кнопка не розтягувалася на всю ширину
                          disabled={issubmitting}
                          style={{ 
                            cursor: 'pointer',
                            marginLeft: 'auto', // Притискає кнопку до правого краю
                            minWidth: '200px',  // Щоб кнопка не "стрибала" при появі спінера
                            marginTop: '20px',
                            padding: '12px 30px', 
                            borderRadius: '12px', 
                            letterSpacing: '0.5px',
                            boxShadow: '0 4px 15px rgba(0, 123, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px' // Відстань між спінером і текстом
                          }}
                        >
                          {issubmitting ? (
                            <>
                              <Spinner size="sm" animation="border" />
                              <span>PROCESSING...</span>
                            </>
                          ) : (
                            isEditing ? "UPDATE PRODUCT" : "ACCEPT PUBLISH"
                          )}
                        </Button>
                      </div>
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