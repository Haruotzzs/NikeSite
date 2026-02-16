import React, { useContext } from "react"; 
import { Link } from 'react-router-dom';
import { ProductContext } from "../../../../Context.jsx"; 

function Comments({ reviews }) {
  const products = useContext(ProductContext);

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
      {reviews.map((review, index) => {
        let rawImg = products.find(p => p.id === review.productId)?.productImg;
        if (rawImg && typeof rawImg === 'object') {
          rawImg = Object.values(rawImg)[0];
        }



        return (
          <div key={index} className="review-history-item">
            <div className="review-product-preview">
              <img 
                src = {rawImg}
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
                  {review.date ? new Date(review.date).toLocaleDateString() : 'Just now'}
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