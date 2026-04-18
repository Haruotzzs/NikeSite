import React, { useState, useEffect } from "react";
import { Container, Row, Col, Table, Button, Modal, Form, Alert, Badge, Spinner } from "react-bootstrap";
import { FaEdit, FaTrash, FaPlus, FaToggleOn, FaToggleOff } from "react-icons/fa";
import "./admin.css";
import { backendUrl } from "../../../Context.jsx";

function Discounts() {
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "percentage",
    value: "",
    applicableTo: "all",
    category: "",
    productIds: [],
    startDate: "",
    endDate: "",
    usageLimit: ""
  });

  useEffect(() => {
    loadDiscounts();
  }, []);

  const loadDiscounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/admin/discounts`);
      if (!response.ok) throw new Error("Failed to load discounts");
      const data = await response.json();
      setDiscounts(data);
    } catch (error) {
      console.error("Error loading discounts:", error);
      showAlert("Error loading discounts", "danger");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, type = "success") => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingDiscount
        ? `${backendUrl}/api/admin/discounts/${editingDiscount._id}`
        : `${backendUrl}/api/admin/discounts`;

      const method = editingDiscount ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          value: parseFloat(formData.value),
          usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
          productIds: formData.applicableTo === "product" ? formData.productIds : []
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save discount");
      }

      const result = await response.json();
      showAlert(result.message);

      setShowModal(false);
      resetForm();
      loadDiscounts();
    } catch (error) {
      console.error("Error saving discount:", error);
      showAlert(error.message, "danger");
    }
  };

  const handleEdit = (discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name || "",
      description: discount.description || "",
      type: discount.type || "percentage",
      value: discount.value?.toString() || "",
      applicableTo: discount.applicableTo || "all",
      category: discount.category || "",
      productIds: discount.productIds || [],
      startDate: discount.startDate ? new Date(discount.startDate).toISOString().split('T')[0] : "",
      endDate: discount.endDate ? new Date(discount.endDate).toISOString().split('T')[0] : "",
      usageLimit: discount.usageLimit?.toString() || ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this discount?")) return;

    try {
      const response = await fetch(`${backendUrl}/api/admin/discounts/${id}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Failed to delete discount");

      showAlert("Discount deleted successfully");
      loadDiscounts();
    } catch (error) {
      console.error("Error deleting discount:", error);
      showAlert("Error deleting discount", "danger");
    }
  };

  const toggleDiscountStatus = async (discount) => {
    try {
      const response = await fetch(`${backendUrl}/api/admin/discounts/${discount._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !discount.isActive })
      });

      if (!response.ok) throw new Error("Failed to update discount status");

      showAlert(`Discount ${!discount.isActive ? 'activated' : 'deactivated'} successfully`);
      loadDiscounts();
    } catch (error) {
      console.error("Error updating discount status:", error);
      showAlert("Error updating discount status", "danger");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "percentage",
      value: "",
      applicableTo: "all",
      category: "",
      productIds: [],
      startDate: "",
      endDate: "",
      usageLimit: ""
    });
    setEditingDiscount(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const formatDiscountValue = (discount) => {
    return discount.type === 'percentage'
      ? `${discount.value}%`
      : `$${discount.value}`;
  };

  const getStatusBadge = (discount) => {
    const now = new Date();
    const startDate = discount.startDate ? new Date(discount.startDate) : null;
    const endDate = discount.endDate ? new Date(discount.endDate) : null;

    if (!discount.isActive) return <Badge bg="secondary">Inactive</Badge>;
    if (startDate && now < startDate) return <Badge bg="warning">Scheduled</Badge>;
    if (endDate && now > endDate) return <Badge bg="danger">Expired</Badge>;
    return <Badge bg="success">Active</Badge>;
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  return (
    <Container fluid className="px-4 py-4">
      {alert && (
        <Alert variant={alert.type} dismissible onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Discount Management</h2>
          <p className="text-muted">Create and manage discount codes for your store</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowModal(true)}
          className="d-flex align-items-center gap-2"
        >
          <FaPlus /> Add Discount
        </Button>
      </div>

      <div className="admin-card">
        <div className="table-responsive">
          <Table hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Value</th>
                <th>Applicability</th>
                <th>Status</th>
                <th>Usage</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {discounts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No discounts found. Create your first discount to get started.
                  </td>
                </tr>
              ) : (
                discounts.map((discount) => (
                  <tr key={discount._id}>
                    <td>
                      <div>
                        <strong>{discount.name}</strong>
                        {discount.description && (
                          <div className="text-muted small">{discount.description}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge bg={discount.type === 'percentage' ? 'info' : 'success'}>
                        {discount.type}
                      </Badge>
                    </td>
                    <td>{formatDiscountValue(discount)}</td>
                    <td>
                      <div className="small">
                        {discount.applicableTo === 'all' && 'All Products'}
                        {discount.applicableTo === 'category' && `Category: ${discount.category || 'N/A'}`}
                        {discount.applicableTo === 'product' && `Specific Products (${discount.productIds?.length || 0})`}
                      </div>
                    </td>
                    <td>{getStatusBadge(discount)}</td>
                    <td>
                      <div className="small">
                        {discount.usageLimit
                          ? `${discount.usedCount || 0}/${discount.usageLimit}`
                          : 'Unlimited'
                        }
                      </div>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEdit(discount)}
                          title="Edit discount"
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => toggleDiscountStatus(discount)}
                          title={discount.isActive ? "Deactivate" : "Activate"}
                        >
                          {discount.isActive ? <FaToggleOn /> : <FaToggleOff />}
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(discount._id)}
                          title="Delete discount"
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
      </div>

      {/* Modal для створення/редагування знижки */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingDiscount ? "Edit Discount" : "Create New Discount"}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Discount Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Discount Type *</Form.Label>
                  <Form.Select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    required
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Value *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.type === 'percentage' ? '100' : undefined}
                    value={formData.value}
                    onChange={(e) => setFormData({...formData, value: e.target.value})}
                    required
                  />
                  <Form.Text className="text-muted">
                    {formData.type === 'percentage' ? 'Percentage (0-100%)' : 'Fixed amount in dollars'}
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Usage Limit</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({...formData, usageLimit: e.target.value})}
                    placeholder="Unlimited if empty"
                  />
                  <Form.Text className="text-muted">
                    Maximum number of uses (leave empty for unlimited)
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Optional description for the discount"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Applicable To</Form.Label>
              <Form.Select
                value={formData.applicableTo}
                onChange={(e) => setFormData({...formData, applicableTo: e.target.value})}
              >
                <option value="all">All Products</option>
                <option value="category">Specific Category</option>
                <option value="product">Specific Products</option>
              </Form.Select>
            </Form.Group>

            {formData.applicableTo === 'category' && (
              <Form.Group className="mb-3">
                <Form.Label>Category</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  placeholder="Enter category name"
                />
              </Form.Group>
            )}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  />
                  <Form.Text className="text-muted">
                    Leave empty to start immediately
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                  />
                  <Form.Text className="text-muted">
                    Leave empty for no expiration
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingDiscount ? "Update Discount" : "Create Discount"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default Discounts;