import "../userprofile.css";
import "../../../styles.css";

import React, { useEffect, useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import Container from "react-bootstrap/Container";
import { Row, Col, Card, Button } from "react-bootstrap";
import { auth, db } from "../../../../server/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ProductContext } from "../../../../Context.jsx";

function Favorite() {
  const navigate = useNavigate();
  const contextData = useContext(ProductContext);
  const products = contextData?.products || [];

  const [likedProductIds, setLikedProductIds] = useState([]);
  const [likedProducts, setLikedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Слухаємо зміни сподобаних товарів користувача
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);

        const unsubscribeFirestore = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data();
              setLikedProductIds(userData.likedItems || []);
            } else {
              setLikedProductIds([]);
            }
            setLoading(false);
          },
          (error) => {
            console.error("Помилка Firestore:", error);
            setLoading(false);
          }
        );

        return () => unsubscribeFirestore();
      } else {
        setCurrentUser(null);
        setLikedProductIds([]);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Фільтруємо товари по ID залюблених
  useEffect(() => {
    const filtered = products.filter((product) =>
      likedProductIds.includes(product._id) || likedProductIds.includes(product.id?.toString())
    );
    setLikedProducts(filtered);
  }, [products, likedProductIds]);

  // Видалити з вибраних
  const handleRemoveFromLikes = async (productId) => {
    if (!currentUser) return;

    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        likedItems: likedProductIds.filter((id) => id !== productId),
      });
    } catch (error) {
      console.error("Error removing from likes:", error);
    }
  };

  if (!currentUser) {
    return (
      <Container className="py-5 text-center">
        <h4>Будь ласка, увійдіть в акаунт</h4>
        <Button onClick={() => navigate("/login")} className="mt-3">
          Увійти
        </Button>
      </Container>
    );
  }

  if (loading) {
    return <Container className="py-5 text-center">Завантаження...</Container>;
  }

  return (
    <Container className="py-5">
      <h3 className="mb-4">Мої вибрані товари ({likedProducts.length})</h3>

      {likedProducts.length === 0 ? (
        <div className="text-center py-5">
          <p className="fs-5 text-muted">Ви ще не вибрали жодного товару</p>
          <Link to="/" className="btn btn-primary">
            Повернутися до каталогу
          </Link>
        </div>
      ) : (
        <Row className="g-4">
          {likedProducts.map((product) => {
            const displayImg =
              product.images && product.images.length > 0
                ? product.images[0].url
                : product.productImg && typeof product.productImg === "object"
                ? Object.values(product.productImg)[0]
                : product.productImg;

            return (
              <Col md={6} lg={4} key={product._id || product.id}>
                <Card className="h-100 shadow-sm">
                  <Card.Img
                    variant="top"
                    src={displayImg}
                    style={{ height: "200px", objectFit: "cover" }}
                  />
                  <Card.Body>
                    <Card.Title>{product.tovarName}</Card.Title>
                    <p className="text-muted small">{product.tovarClass}</p>
                    <p className="fw-bold fs-5">
                      ₴ {product.price || product.tovarPrice}
                    </p>
                  </Card.Body>
                  <Card.Footer className="bg-transparent d-grid gap-2">
                    <Link
                      to={`/product/${product._id || product.id}`}
                      className="btn btn-outline-primary btn-sm"
                    >
                      Переглянути
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveFromLikes(product._id || product.id)}
                    >
                      Видалити з вибраних
                    </Button>
                  </Card.Footer>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Container>
  );
}

export default Favorite;