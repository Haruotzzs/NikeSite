import React, { useContext } from "react"; 
import { Link } from 'react-router-dom';
import { ProductContext } from "../../../../Context.jsx"; 

function Comments({ reviews }) {
  const contextData = useContext(ProductContext);
  const products = contextData?.products || [];

  if (!reviews || reviews.length === 0) {
    return (
      <div className="empty-reviews">
        <span className="material-symbols-outlined">notes</span>
        <p>You haven't shared any thoughts yet. Your feedback helps others!</p>
      </div>
    );
  }

  return (
    <div className="profile-reviews-list">

      <h2 style={{ marginBottom: '30px', fontWeight: '800', color: '#1e293b' }}>My Reviews</h2>

      {reviews.map((review, index) => {
        const product = products.find(p => p._id === review.productId || p.id === review.productId);
        let rawImg = product?.images && product.images.length > 0
          ? product.images[0].url
          : product?.productImg;
          
        if (rawImg && typeof rawImg === 'object') {
          rawImg = Object.values(rawImg)[0];
        }

        return (
          <div key={index} className="review-history-item">
            <div className="review-product-preview">
              <img 
                src={rawImg || "/fallback-image.jpg"}
                alt={review.productName} 
                onError={(e) => { e.target.src = "/none_img.jpg"; }} 
              />
              <div className="preview-details">
                <Link to={`/product/${review.productId}`} className="preview-name">
                  {review.productName}
                </Link>
                <p className="preview-status">Verified Purchase</p>
              </div>
            </div>

            <div className="review-content-body">
              <div className="review-meta-row">
                <div className="stars-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                      key={star}
                      className="material-symbols-outlined"
                      style={{ 
                        fontSize: '18px', 
                        color: star <= review.rating ? '#000' : '#ddd',
                        fontVariationSettings: star <= review.rating ? "'FILL' 1" : "'FILL' 0" 
                      }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <span className="review-date-label">
                  {review.date ?  new Date(review.date).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  }) 
                : "Processing..."
            }
                </span>
              </div>
              <p className="review-text">"{review.comment}"</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Comments;