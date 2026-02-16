import React, { useContext, useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Container } from "react-bootstrap";
import "./product.css";
import "../../styles.css";
import avatar from "../../img/none_avatar.jpg";
import { 
  doc, setDoc, arrayUnion, arrayRemove, onSnapshot
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../server/firebase.js";
import { ProductContext } from "../../../Context.jsx";

import Card from "../../card/Card.jsx"

const Product = () => {
  const { id } = useParams();
  const products = useContext(ProductContext);
  const scrollRef = useRef(null);

  const [showComments, setShowComments] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isInBag, setIsInBag] = useState(false);
  const [activeImg, setActiveImg] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);

  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState(0);

  const product = products.find((item) => item.id === parseInt(id));



// Функція для розрахунку середнього рейтингу
const calculateAverageRating = () => {
  // Додаємо перевірку на існування product
  if (!product || !product.reviews || product.reviews.length === 0) {
    return 0;
  }
  
  const total = product.reviews.reduce((sum, review) => sum + Number(review.rating), 0);
  const average = total / product.reviews.length;
  
  return average.toFixed(1);
};

const averageRating = calculateAverageRating();

const handleAddComment = async () => {
  if (!currentUser) return alert("Будь ласка, увійдіть в акаунт.");
  if (!newComment.trim()) return alert("Напишіть текст відгуку.");

  // 1. ПЕРЕВІРКА: Шукаємо відгук поточного користувача в локальних даних продукту
  const hasAlreadyReviewed = product.reviews?.some(
    (review) => review.userId === currentUser.uid
  );

  if (hasAlreadyReviewed) {
    alert("Ви вже залишили відгук для цього товару. Дякуємо за вашу думку!");
    return;
  }

  const reviewData = {
    userId: currentUser.uid, // Передаємо UID з Firebase Auth
    user: currentUser.displayName || "Anonymous",
    comment: newComment,
    rating: newRating
  };

  try {
    const response = await fetch(`http://localhost:4200/products/${product.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewData),
    });

    if (response.ok) {
      alert("Відгук опубліковано!");
      setNewComment("");
      setShowComments(false); // Закриваємо модалку
      // Тут бажано оновити дані через контекст (refresh)
    } else {
      const errorData = await response.json();
      alert(errorData.error || "Виникла помилка");
    }
  } catch (error) {
    console.error("Помилка:", error);
  }
};

  const recommendations = products.filter(
    (item) => item.tovarClass === product?.tovarClass && item.id !== product?.id
  );

  const allVariants = products.filter(
    (item) => item.tovarClass === product?.tovarClass
  );

  const images = product?.productImg 
    ? (typeof product.productImg === 'object' ? Object.values(product.productImg) : [product.productImg])
    : [];

  useEffect(() => {
    if (images.length > 0) setActiveImg(images[0]);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setIsLiked(userData.likedItems?.includes(id) || false);
            const alreadyInBag = userData.bagElements?.some(
              item => item.id === product?.id && item.selectedSize === selectedSize
            );
            setIsInBag(alreadyInBag);
          }
        });
        return () => unsubscribeFirestore();
      } else {
        setCurrentUser(null);
        setIsLiked(false);
        setIsInBag(false);
      }
    });
    return () => unsubscribeAuth();
  }, [id, product?.id, selectedSize, images.length]); 

  const handleAddToBag = async () => {
    if (!currentUser) return alert("Будь ласка, увійдіть в акаунт.");
    if (product.size && !selectedSize) return alert("Будь ласка, виберіть розмір.");
    
    const displayImg = typeof product.productImg === 'object' ? Object.values(product.productImg)[0] : product.productImg;
    const userDocRef = doc(db, "users", currentUser.uid);
    const itemData = {
      id: product.id,
      tovarName: product.tovarName,
      tovarPrice: product.tovarPrice,
      productImg: displayImg,
      type: product.tovarClass,
      selectedSize: selectedSize, 
      colors: product.colors || 1
    };

    try {
      if (isInBag) {
        await setDoc(userDocRef, { bagElements: arrayRemove(itemData) }, { merge: true });
      } else {
        await setDoc(userDocRef, { bagElements: arrayUnion(itemData) }, { merge: true });
      }
    } catch (error) { console.error("Помилка кошика:", error); }
  };

  const handleLikeToggle = async () => {
    if (!currentUser) return alert("Будь ласка, увійдіть в акаунт.");
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      await setDoc(userDocRef, {
        likedItems: isLiked ? arrayRemove(id) : arrayUnion(id)
      }, { merge: true });
    } catch (error) { console.error("Помилка лайка:", error); }
  };

  if (!product) return <h2>Product not found</h2>;

  const getBtnStyle = (sizeName) => {
    const isAvailable = product.size ? product.size[sizeName] : true;
    return {
      backgroundColor: isAvailable ? (selectedSize === sizeName ? "black" : "white") : "#f5f5f5",
      color: isAvailable ? (selectedSize === sizeName ? "white" : "black") : "#cccccc",
      cursor: isAvailable ? "pointer" : "not-allowed",
      opacity: isAvailable ? 1 : 0.6,
      border: "1px solid #ddd",
      marginRight: "5px",
      padding: "8px 12px",
      minWidth: "45px"
    };
  };

  return (
    <Container>
      <div 
        className="Comments-pool" 
        style={{ display: showComments ? "flex" : "none" }}
        onClick={() => setShowComments(false)}
      >
        <div className="Comments-canvas" onClick={(e) => e.stopPropagation()}>
          <button className="close-modal" onClick={() => setShowComments(false)}>×</button>
          
          <div className="modal-content" style={{ width: '100%' }}>
            <div className="modal-product-summary" style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center' }}>
              <img src={images[0]} alt="Product mini" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
              <div className="mini-info">
                <h4 style={{ margin: 0, fontSize: '18px' }}>{product.tovarName}</h4>
                <p style={{ margin: 0, color: '#757575', fontSize: '14px' }}>{product.tovarClass}</p>
                <p style={{ margin: '5px 0 0', fontWeight: 'bold' }}>{product.tovarPrice}$</p>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '20px' }} />

            {/* --- ФОРМА ВВОДУ НОВОГО КОМЕНТАРЯ --- */}
            <div className="add-comment-form" style={{ marginBottom: '25px' }}>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span 
                    key={star}
                    className="material-symbols-outlined"
                    style={{ cursor: 'pointer', color: star <= newRating ? 'black' : '#ddd',  fontVariationSettings: "'FILL' 1" }}
                    onClick={() => setNewRating(star)}
                  >star</span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="Write a review..." 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none' }}
                />
                <button 
                  onClick={handleAddComment}
                  style={{ padding: '10px 20px', borderRadius: '20px', border: 'none', backgroundColor: 'black', color: 'white', cursor: 'pointer' }}
                >Post</button>
              </div>
            </div>

            <h5 style={{ marginBottom: '15px' }}>Customer Reviews ({product.reviews?.length || 0})</h5>

            <div className="reviews-scroll-area" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {product.reviews && product.reviews.length > 0 ? (
                product.reviews.map((review, index) => (
                  <div className="oneTab" key={index} style={{ display: 'flex', marginBottom: '20px', borderBottom: '1px solid #f9f9f9', paddingBottom: '15px' }}>
                    <img className="comment-avatar" src={avatar} alt="Avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '15px' }} />
                    <div className="Username" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <p style={{ fontWeight: 'bold', margin: 0 }}>{review.user}</p>
                        <div className="Stars">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="material-symbols-outlined" style={{ fontSize: '16px', color: i < review.rating ? 'black' : '#ddd', cursor: 'pointer', fontVariationSettings: i < review.rating ? "'FILL' 1" : "'FILL' 0"   }}>star</span>
                          ))}
                        </div>
                      </div>
                      <div className="text" style={{ marginTop: '5px' }}>
                        <p style={{ fontSize: '14px', color: '#444' }}>{review.comment}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No reviews yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ paddingTop: "15vh", justifyContent: "center", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* ... Решта вашого коду без змін ... */}
        <div className="product-container">
           {/* Блоки з картинками та описом залишаються як були */}
           <div className="size-img">
            {images.map((imgUrl, index) => (
              <img 
                key={index} 
                src={imgUrl} 
                className={activeImg === imgUrl ? "active-thumb" : ""}
                onMouseEnter={() => setActiveImg(imgUrl)}
                alt="preview"
              />
            ))}
          </div>
          
          <div className="mainImg">
            <img src={activeImg || images[0]} alt={product.tovarName} />
            <div className="size" style={{ marginTop: '20px' }}>
              <p style={{ fontWeight: '500', marginBottom: '10px' }}>Select Size</p>
              {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                <button 
                  key={s}
                  disabled={product.size && product.size[s] === false}
                  onClick={() => setSelectedSize(s)}
                  style={getBtnStyle(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="title-container">
            <div className="info">
              <h2 className="product-title">{product.tovarName}</h2>
              <p style={{ color: '#757575' }}>{product.tovarClass}</p>
              <span className="card-price">
                <p style={{ fontSize: '22px', fontWeight: '600' }}>{product.tovarPrice}$</p>
              </span>
            </div>

            <div className="shippingInfo">
              <h2 className="card-title1">Shipping</h2>
              <p className="arrived">Standard delivery 3-5 business days.</p>
              <h2 className="card-title1" style={{ marginTop: '10px' }}>Find a Store</h2>
              <p><Link to="/find-a-store" style={{ color: 'black', textDecoration: 'underline' }}>Click here</Link></p>
            </div>

            <div className="Btn_container">
              <div className="firstTab">
                <button 
                  className="Buy-btn" 
                  onClick={handleAddToBag}
                  style={{ 
                    backgroundColor: isInBag ? "#555" : "black", 
                    color: 'white', flex: 1, padding: '15px', borderRadius: '30px', border: 'none' 
                  }}
                >
                  {isInBag ? "Remove from Bag" : "Add to Bag"}
                </button>

                <button onClick={handleLikeToggle} className="Like-btn" style={{ background: 'none' }}>
                  <span 
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0", color: isLiked ? 'black' : 'black' }}
                  >
                    favorite
                  </span>
                </button>
              </div>
            </div>

            <div className="towar-description">
              <p style={{ fontWeight: 'bold' }}>Description</p>
              {product.description}
            </div>
            
            <div className="mark-desc">
              <li style={{ listStyle: 'none' }}>Colour: {product.color || "Default"}</li>
              <li style={{ listStyle: 'none' }}>Style: IB3363-{product.id}</li>
            </div>
          </div>
        </div>

        <div className="reviews-section">
           {/* Блок з відгуками під товаром */}
           <div className="shown-colors">
            {allVariants.map((item) => (
              <Link key={item.id} to={`/product/${item.id}`}>
                <img 
                  src={typeof item.productImg === 'object' ? Object.values(item.productImg)[0] : item.productImg} 
                  alt="variant" 
                  style={{ border: item.id === product.id ? "2px solid black" : "1px solid #ddd" }}
                />
              </Link>
            ))}
          </div> 
          
          <div className="User_comment">
  <h3>Join the conversation</h3>
  <div className="rating">
    <div className="rating_stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <span 
          key={star}
          className="material-symbols-outlined" 
          style={{ 
            fontSize: "30px", 
            // Зірка зафарбована, якщо її номер менший або дорівнює середньому рейтингу
            color: star <= Math.round(averageRating) ? 'black' : '#ddd', 
            fontVariationSettings: star <= Math.round(averageRating) ? "'FILL' 1" : "'FILL' 0" 
          }} 
        >
          star
        </span>
      ))}
      <div className="value">
        <h3>{averageRating > 0 ? averageRating : "No rating"}</h3>
      </div> 
    </div>
  </div> 
  <p style={{ marginBottom: '25px' }}>({product.reviews?.length || 0}) reviews</p>
  
  <button className="write-review" onClick={() => setShowComments(true)}>
    <span className="material-symbols-outlined write-icon">edit</span>
    <p style={{ margin: 0 }}>View all reviews</p>
  </button>
</div>

        </div>

        <div className="recommendations-container" style={{ width: '100%', maxWidth: '1200px', margin: '80px 0', padding: '0 20px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontWeight: 'bold', margin: 0 }}>You might also like</h2>
          </div>
          <div className="recommendations-scroll" ref={scrollRef}>
            {recommendations.map(rec => (
              <Card  />
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Product;