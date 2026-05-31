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

  // ── UI STATE ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);            // blocks render until auth resolves
  const [isAdmin, setIsAdmin] = useState(false);           // gates the whole page
  const [issubmitting, setIsSubmitting] = useState(false); // disables submit button during request
  const [message, setMessage] = useState({ type: "", text: "" }); // success / error alert

  // ── EDIT MODE STATE ───────────────────────────────────────────────────────
  // When ?id=<productId> is in the URL, the form switches to edit mode.
  // isEditing changes the submit method (POST → PUT) and the button label.
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  // ── FORM DATA ─────────────────────────────────────────────────────────────
  // Single source of truth for all form fields.
  // images: array of { file?: File, url: string }
  //   - New uploads:     { file: File, url: blobURL }  → sent as multipart files
  //   - Existing images: { url: string }               → sent as existingImages JSON
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
    images: [],
  });

  // ── SECTION VISIBILITY & SEARCH STATE ────────────────────────────────────
  const [showSizesSection, setShowSizesSection] = useState(false);
  const [variantSearchQuery, setVariantSearchQuery] = useState("");
  const [variantSearchResults, setVariantSearchResults] = useState([]);

  // ── PRODUCT LIST (for variant search) ────────────────────────────────────
  // Pulled from global context — no extra fetch needed.
  const contextData = useContext(ProductContext);
  const allProducts = contextData?.products || [];

  // ── EFFECT: Detect edit mode from URL ────────────────────────────────────
  // Runs on mount and whenever URL search params change.
  // If ?id= is present, switch to edit mode and pre-fill the form.
  useEffect(() => {
    const productId = searchParams.get("id");
    if (productId) {
      setIsEditing(true);
      setEditingProductId(productId);
      loadProductForEdit(productId);
    }
  }, [searchParams]);

  // ── EFFECT: Firebase Auth Guard ───────────────────────────────────────────
  // onAuthStateChanged fires once on mount with the current user (or null).
  // - No user → redirect to /login
  // - User exists → check Firestore for admin role
  // - No admin exists yet in DB → promote this first user to admin (bootstrap)
  // - Non-admin user → redirect to home
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
          // ── User is already an admin
          setIsAdmin(true);
        } else {
          // ── Check if any admin exists in the system at all
          const adminQuery = query(
            collection(db, "users"),
            where("role", "==", "admin"),
            limit(1)
          );
          const adminSnap = await getDocs(adminQuery);

          if (adminSnap.empty) {
            // ── No admin exists yet → bootstrap: make this user the first admin
            await setDoc(userDocRef, { role: "admin", email: user.email }, { merge: true });
            setIsAdmin(true);
          } else {
            // ── An admin exists but this user isn't one → deny access
            navigate("/");
          }
        }
      } catch (error) {
        // silently handle Firestore errors (e.g. network issues)
      } finally {
        // ── Always lift the loading gate, even on error
        setLoading(false);
      }
    });

    // Cleanup: unsubscribe from the auth listener when the component unmounts
    return () => unsubscribeAuth();
  }, [navigate]);

  // ── HANDLER: Generic text/number input change ─────────────────────────────
  // Uses the input's `name` attribute to update the matching key in productData.
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProductData((prev) => ({ ...prev, [name]: value }));
  };

  // ── ASYNC: Load product data for editing ──────────────────────────────────
  // Fetches the product from the backend and maps its fields into productData.
  // Images are normalized to { url } objects so the gallery renders correctly.
  // No `file` property is set — these are existing images, not new uploads.
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
          // ── Normalize: DB may return strings or { url } objects
          images: product.images
            ? product.images.map((img) => ({
                url: typeof img === "string" ? img : img.url,
                // No `file` → identifies these as already-uploaded images
              }))
            : [],
        });
      } else {
        setMessage({ type: "danger", text: "Failed to load product for editing" });
      }
    } catch (error) {
      setMessage({ type: "danger", text: "Error loading product for editing" });
    }
  };

  // ── HANDLER: Size checkbox toggle ─────────────────────────────────────────
  // Adds the size if not present, removes it if already selected (toggle).
  const handleSizeChange = (size) => {
    setProductData((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size],
    }));
  };

  // ── HANDLER: Variant search ───────────────────────────────────────────────
  // Filters allProducts (from context) client-side — no extra API call needed.
  // Only shows products in the same category that aren't already added as variants.
  const handleVariantSearch = (query) => {
    setVariantSearchQuery(query);
    if (query.trim() === "") {
      setVariantSearchResults([]);
      return;
    }
    const results = allProducts.filter(
      (p) =>
        p.tovarName?.toLowerCase().includes(query.toLowerCase()) &&
        p.tovarClass === productData.category &&
        !productData.variants.some((v) => v.id === p.id || v.id === p._id)
    );
    setVariantSearchResults(results);
  };

  // ── HANDLER: Add a variant from search results ────────────────────────────
  // Extracts only the fields needed for the variant chip UI.
  // Supports both new image format (images[].url) and legacy (productImg).
  // Clears the search input and results after selection.
  const addVariant = (product) => {
    const variantData = {
      id: product._id || product.id,
      name: product.tovarName,
      mainImage:
        product.images?.[0]?.url ||
        (typeof product.productImg === "object"
          ? Object.values(product.productImg)[0]
          : product.productImg),
      price: product.price || product.tovarPrice,
      color: "",
    };
    setProductData((prev) => ({
      ...prev,
      variants: [...prev.variants, variantData],
    }));
    setVariantSearchQuery("");
    setVariantSearchResults([]);
  };

  // ── HANDLER: Update color label on an existing variant chip ──────────────
  const updateVariantColor = (variantId, newColor) => {
    setProductData((prev) => ({
      ...prev,
      variants: prev.variants.map((v) =>
        v.id === variantId ? { ...v, color: newColor } : v
      ),
    }));
  };

  // ── HANDLER: Remove a variant chip ───────────────────────────────────────
  const removeVariant = (variantId) => {
    setProductData((prev) => ({
      ...prev,
      variants: prev.variants.filter((v) => v.id !== variantId),
    }));
  };

  // ── HANDLER: File input change (add new images) ───────────────────────────
  // Creates a temporary blob URL for each file for instant preview.
  // The File object is kept alongside so it can be sent via FormData on submit.
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newImages = files.map((file) => ({
        file,                           // kept for FormData upload on submit
        url: URL.createObjectURL(file), // temporary local preview URL
      }));
      setProductData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    }
  };

  // ── HANDLER: Remove an image from the gallery ─────────────────────────────
  // For new (blob) images: revokes the blob URL to free browser memory.
  // For existing images: just removes from state — the backend handles
  // Supabase cleanup when it sees the URL missing from existingImages on submit.
  // Uses functional updater to always read latest state (avoids stale closure).
  const removeImage = (index) => {
    setProductData((prev) => {
      const updated = [...prev.images];
      if (updated[index]?.file) {
        URL.revokeObjectURL(updated[index].url); // free memory for blob URLs
      }
      updated.splice(index, 1);
      return { ...prev, images: updated };
    });
  };

  // ── HANDLER: Reorder images (↑ / ↓ buttons) ──────────────────────────────
  // Swaps the image at `index` with its neighbor in the given direction.
  // The resulting array order is what gets sent to the backend as existingImages,
  // so index 0 becomes the product's main/thumbnail image.
  // Uses functional updater + array swap to avoid stale state bugs.
  const moveImage = (index, direction) => {
    setProductData((prev) => {
      const imgs = [...prev.images];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= imgs.length) return prev; // boundary guard — no-op
      [imgs[index], imgs[target]] = [imgs[target], imgs[index]]; // swap
      return { ...prev, images: imgs };
    });
  };

  // ── HANDLER: Form submit gate ─────────────────────────────────────────────
  // Prevents default browser form submission.
  // On create: requires at least one image before proceeding.
  // On edit: images are optional (user may keep existing ones unchanged).
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditing && productData.images.length === 0) {
      setMessage({ type: "danger", text: "Please select at least one image." });
      return;
    }
    await confirmSubmit();
  };

  // ── ASYNC: Build and send the form payload ────────────────────────────────
  // Uses FormData (not JSON) because we need to send binary image files.
  //
  // Image strategy:
  //   existingImages → JSON array of URLs for already-uploaded images, in their
  //                    new order after any reordering/removal the user did.
  //                    The backend uses this list to reconstruct the final image
  //                    array and delete any removed images from Supabase.
  //   images (files) → new File objects appended to FormData.
  //                    The backend uploads these to Supabase and appends them
  //                    after the existing images in the final array.
  //
  // POST → creates a new product
  // PUT  → updates the existing product by editingProductId
  const confirmSubmit = async () => {
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const formData = new FormData();

      // ── Append scalar fields
      formData.append("tovarName", productData.name);
      formData.append("tovarClass", productData.category);
      formData.append("price", productData.price);
      formData.append("description", productData.description);
      formData.append("color", productData.color);
      formData.append("tovarColor", productData.color); // legacy field alias
      formData.append("sizes", JSON.stringify(productData.sizes));
      formData.append("variants", JSON.stringify(productData.variants));
      formData.append("discount", productData.discount);

      // ── Separate existing images (no `file`) from new uploads (have `file`)
      const existingImages = productData.images
        .filter((img) => !img.file) // already uploaded — identified by missing .file
        .map((img) => img.url);     // backend only needs the URL to match against DB

      formData.append("existingImages", JSON.stringify(existingImages));

      // ── Append new image files for Supabase upload on the backend
      productData.images.forEach((img) => {
        if (img.file) {
          formData.append("images", img.file);
        }
      });

      // ── Choose endpoint and HTTP method based on create vs. edit mode
      const url = isEditing
        ? `${backendUrl}/api/admin/products/${editingProductId}`
        : `${backendUrl}/api/admin/products`;
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, { method, body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error while saving product");

      setMessage({
        type: "success",
        text: isEditing ? "Product updated successfully!" : "Product added successfully!",
      });

      if (isEditing) {
        // ── Edit flow: refresh global product list, then go back to products page
        if (refreshProducts) refreshProducts();
        navigate("/admin-page/products");
      } else {
        // ── Create flow: revoke all blob URLs to free browser memory, then reset form
        productData.images.forEach((img) => {
          if (img.file) URL.revokeObjectURL(img.url);
        });
        setProductData({
          name: "", price: "", category: "", color: "",
          description: "", stock: 1, sizes: [], variants: [], discount: 0, images: [],
        });
        if (refreshProducts) refreshProducts();
        navigate("/");
      }
    } catch (error) {
      setMessage({ type: "danger", text: error.message || "Server connection error." });
    } finally {
      // ── Always re-enable the submit button, success or failure
      setIsSubmitting(false);
    }
  };

  // ── RENDER GATES ──────────────────────────────────────────────────────────
  // Show spinner while auth is resolving (avoids flash of unauthorized content).
  if (loading) {
    return (
      <Container
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <Spinner animation="border" variant="primary" />
        <h4 className="mt-3">Processing...</h4>
      </Container>
    );
  }

  // Render nothing if auth resolved but user is not admin.
  // Navigation to "/" already happened inside the auth effect above.
  if (!isAdmin) return null;

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
                <Link to="/admin-page/add-product" className="nav-item active">
                  <span className="material-symbols-outlined">add_box</span> Add Product
                </Link>
                <Link to="/admin-page/orders" className="nav-item">
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
      

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="admin-main">
        <Container fluid className="px-4 py-4">
          <Row className="justify-content-center">
            <Col lg={11} xl={10}>
              <div
                className="content-card"
                style={{ background: "#fff", borderRadius: "15px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", padding: "30px" }}
              >
                {/* ── Alert: shown after submit success or error ── */}
                {message.text && (
                  <Alert variant={message.type} dismissible onClose={() => setMessage({ type: "", text: "" })}>
                    {message.text}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Row className="g-4">

                    {/* ── LEFT COLUMN: text fields ─────────────────────── */}
                    <Col md={7}>

                      {/* Product Name */}
                      <Form.Group className="mb-4">
                        <Form.Label style={{ display: "block", fontWeight: "600", marginBottom: "8px", color: "#555", textAlign: "left" }}>
                          Product Name
                        </Form.Label>
                        <Form.Control
                          type="text" name="name" required
                          value={productData.name} onChange={handleInputChange}
                          placeholder="enter"
                          style={{ width: "100%", borderRadius: "10px", padding: "12px", border: "1px solid #e0e0e0" }}
                        />
                      </Form.Group>

                      {/* Price */}
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-4">
                            <Form.Label style={{ display: "block", fontWeight: "600", color: "#555", marginBottom: "8px" }}>
                              Cost ($)
                            </Form.Label>
                            <Form.Control
                              type="number" name="price" required
                              value={productData.price} onChange={handleInputChange}
                              placeholder="0.00"
                              style={{ width: "100%", borderRadius: "10px", padding: "12px" }}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      {/* Category — also used to scope variant search results */}
                      <Form.Group className="mb-4">
                        <Form.Label style={{ display: "block", fontWeight: "600", color: "#555", marginBottom: "8px" }}>
                          Category
                        </Form.Label>
                        <Form.Control
                          type="text" name="category" required
                          value={productData.category} onChange={handleInputChange}
                          placeholder="e.g., Shoes, Pants, Sweaters..."
                          style={{ width: "100%", borderRadius: "10px", padding: "12px", border: "1px solid #e0e0e0" }}
                        />
                      </Form.Group>

                      {/* Color */}
                      <Form.Group className="mb-4">
                        <Form.Label style={{ display: "block", fontWeight: "600", color: "#555", marginBottom: "8px" }}>
                          Color
                        </Form.Label>
                        <Form.Control
                          type="text" name="color"
                          value={productData.color} onChange={handleInputChange}
                          placeholder="e.g., Red, Navy, White"
                          style={{ width: "100%", borderRadius: "10px", padding: "12px", border: "1px solid #e0e0e0" }}
                        />
                      </Form.Group>

                      {/* Description */}
                      <Form.Group className="mb-4">
                        <Form.Label style={{ display: "block", fontWeight: "600", color: "#555", marginBottom: "8px" }}>
                          Description
                        </Form.Label>
                        <Form.Control
                          as="textarea" rows={4} name="description" required
                          placeholder="Describe the product materials, fit, etc..."
                          value={productData.description} onChange={handleInputChange}
                          style={{ width: "100%", borderRadius: "10px", padding: "12px", resize: "none" }}
                        />
                      </Form.Group>

                      {/* Discount */}
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-4">
                            <Form.Label style={{ display: "block", fontWeight: "600", color: "#555", marginBottom: "8px" }}>
                              Discount (%)
                            </Form.Label>
                            <Form.Control
                              type="number" name="discount" min="0" max="100"
                              value={productData.discount} onChange={handleInputChange}
                              placeholder="0"
                              style={{ width: "100%", borderRadius: "10px", padding: "12px" }}
                            />
                          </Form.Group>
                        </Col>
                      </Row>

                      {/* ── VARIANTS ────────────────────────────────────────
                          Search filters allProducts from context by category.
                          Selected variants render as image chips with a color
                          label input underneath each one.                     */}
                      <Form.Group className="mb-4">
                        <Form.Label style={{ display: "block", fontWeight: "600", color: "#555", marginBottom: "12px" }}>
                          Product Variants (Colors/Styles)
                        </Form.Label>

                        {/* Search input */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                          <Form.Control
                            type="text"
                            placeholder="Search products in this category..."
                            value={variantSearchQuery}
                            onChange={(e) => handleVariantSearch(e.target.value)}
                            style={{ borderRadius: "8px" }}
                          />
                        </div>

                        {/* Search results dropdown */}
                        {variantSearchResults.length > 0 && (
                          <div style={{ border: "1px solid #ddd", borderRadius: "8px", maxHeight: "250px", overflowY: "auto", marginBottom: "12px" }}>
                            {variantSearchResults.map((product) => (
                              <div
                                key={product._id || product.id}
                                onClick={() => addVariant(product)}
                                style={{ display: "flex", alignItems: "center", padding: "10px", borderBottom: "1px solid #f0f0f0", cursor: "pointer", transition: "background 0.2s", backgroundColor: "#f9f9f9" }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f9f9f9")}
                              >
                                <img
                                  src={product.images?.[0]?.url || (typeof product.productImg === "object" ? Object.values(product.productImg)[0] : product.productImg)}
                                  alt={product.tovarName}
                                  style={{ width: "40px", height: "40px", borderRadius: "4px", marginRight: "10px", objectFit: "cover" }}
                                />
                                <div style={{ flex: 1 }}>
                                  <p style={{ margin: 0, fontWeight: "500" }}>{product.tovarName}</p>
                                  <small style={{ color: "#999" }}>${product.price || product.tovarPrice}</small>
                                </div>
                                <span style={{ color: "#007bff", fontWeight: "600" }}>+ Add</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Selected variant chips */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                          {productData.variants && productData.variants.map((variant) => (
                            <div key={variant.id} style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                              <div style={{ position: "relative", borderRadius: "8px", border: "2px solid #007bff", overflow: "hidden", width: "80px", height: "80px", cursor: "pointer" }}>
                                <img src={variant.mainImage} alt={variant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                <Button
                                  variant="danger" size="sm"
                                  onClick={() => removeVariant(variant.id)}
                                  style={{ position: "absolute", top: "-8px", right: "-8px", padding: "2px 6px", borderRadius: "50%", fontSize: "14px" }}
                                >×</Button>
                                <div style={{ position: "absolute", bottom: "0", left: "0", right: "0", backgroundColor: "rgba(0,0,0,0.7)", color: "white", padding: "2px 4px", fontSize: "10px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {variant.name}
                                </div>
                              </div>
                              {/* Color label input for this variant */}
                              <input
                                type="text" placeholder="Color"
                                value={variant.color || ""}
                                onChange={(e) => updateVariantColor(variant.id, e.target.value)}
                                style={{ width: "80px", padding: "6px 8px", borderRadius: "4px", border: "1px solid #ddd", fontSize: "12px", textAlign: "center" }}
                              />
                            </div>
                          ))}
                          {(!productData.variants || productData.variants.length === 0) && (
                            <div style={{ width: "100%", padding: "20px", textAlign: "center", color: "#999", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
                              Search and select product variants
                            </div>
                          )}
                        </div>
                      </Form.Group>

                      {/* ── SIZES (collapsible section) ───────────────────── */}
                      <Form.Group className="mb-4">
                        <Button
                          variant="outline-secondary"
                          onClick={() => setShowSizesSection(!showSizesSection)}
                          style={{ width: "100%", borderRadius: "10px", padding: "10px", fontWeight: "600" }}
                        >
                          {showSizesSection ? "▼ Hide Sizes" : "▶ Show Sizes"}
                        </Button>
                      </Form.Group>

                      {showSizesSection && (
                        <Form.Group className="mb-4">
                          <Form.Label style={{ display: "block", fontWeight: "600", color: "#555", marginBottom: "8px" }}>
                            Available Sizes
                          </Form.Label>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                            {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
                              <Form.Check
                                key={size} type="checkbox"
                                id={`size-${size}`} label={size}
                                checked={productData.sizes.includes(size)}
                                onChange={() => handleSizeChange(size)}
                                style={{ marginRight: "15px" }}
                              />
                            ))}
                          </div>
                        </Form.Group>
                      )}
                    </Col>

                    {/* ── RIGHT COLUMN: image gallery + submit button ───── */}
                    <Col md={5} className="d-flex flex-column">
                      <Form.Group className="mb-4 p-3" style={{ backgroundColor: "#fcfcfc", border: "2px dashed #d1d8e0", borderRadius: "12px" }}>
                        <Form.Label style={{ padding: "10px", fontWeight: "700", color: "#444" }}>
                          Product Gallery
                        </Form.Label>

                        {/* ── Image grid
                            Each card shows:
                              - MAIN badge on index 0 (first image = thumbnail sent to backend)
                              - ↑ / ↓ buttons to reorder (order is preserved in existingImages)
                              - × button to remove (revokes blob URL if new; drops from
                                existingImages if existing, triggering backend Supabase cleanup) */}
                        <div
                          className="image-preview-grid"
                          style={{ minHeight: "160px", marginBottom: "15px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px" }}
                        >
                          {productData.images.length > 0 ? (
                            productData.images.map((img, index) => (
                              <div key={index} className="image-preview-item">
                                <img src={img.url} alt="Preview" />

                                {/* MAIN badge — only on first image */}
                                {index === 0 && (
                                  <div style={{ position: "absolute", top: "4px", left: "4px", backgroundColor: "gold", color: "#333", padding: "2px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold" }}>
                                    MAIN
                                  </div>
                                )}

                                {/* Reorder buttons — boundary-checked against productData.images.length */}
                                <div style={{ position: "absolute", bottom: "5px", left: "5px", right: "5px", display: "flex", gap: "4px" }}>
                                  <Button
                                    size="sm"
                                    onClick={() => moveImage(index, "up")}
                                    disabled={index === 0}
                                    style={{ padding: "2px 6px", fontSize: "12px", flex: 1 }}
                                    title="Move up"
                                  >↑</Button>
                                  <Button
                                    size="sm"
                                    onClick={() => moveImage(index, "down")}
                                    disabled={index === productData.images.length - 1}
                                    style={{ padding: "2px 6px", fontSize: "12px", flex: 1 }}
                                    title="Move down"
                                  >↓</Button>
                                </div>

                                {/* Remove button */}
                                <Button
                                  className="delete-photo-btn"
                                  variant="danger" size="sm"
                                  onClick={() => removeImage(index)}
                                  style={{ position: "absolute", top: "5px", right: "5px", padding: "0 6px", borderRadius: "50%", fontSize: "16px" }}
                                >×</Button>
                              </div>
                            ))
                          ) : (
                            /* Empty state placeholder */
                            <div className="w-100 text-center py-4 text-muted" style={{ gridColumn: "1 / -1" }}>
                              <span className="material-symbols-outlined d-block fs-1">collections</span>
                              <span style={{ fontSize: "0.9rem" }}>No images added yet</span>
                            </div>
                          )}
                        </div>

                        {/* File picker — supports multiple files, images only */}
                        <Form.Control
                          type="file" multiple accept="image/*"
                          onChange={handleImageChange}
                          className="mb-2"
                          style={{ fontSize: "0.85rem", width: "100%" }}
                        />
                      </Form.Group>

                      {/* ── Submit button ──────────────────────────────────
                          Disabled while request is in flight (issubmitting).
                          Shows spinner + "PROCESSING..." during submission.
                          Label changes based on isEditing mode.              */}
                      <div className="publish-btn-container mt-auto" style={{ display: "flex" }}>
                        <Button
                          type="submit" variant="primary"
                          className="py-3 fw-bold"
                          disabled={issubmitting}
                          style={{ cursor: "pointer", marginLeft: "auto", minWidth: "200px", marginTop: "20px", padding: "12px 30px", borderRadius: "12px", letterSpacing: "0.5px", boxShadow: "0 4px 15px rgba(0, 123, 255, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}
                        >
                          {issubmitting ? (
                            <>
                              <Spinner size="sm" animation="border" />
                              <span>PROCESSING...</span>
                            </>
                          ) : isEditing ? (
                            "UPDATE PRODUCT"
                          ) : (
                            "ACCEPT PUBLISH"
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