# NikeSite — Unofficial Nike Store

> An unofficial full-stack Nike e-commerce store built with React + Node.js + MongoDB + Firebase.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| React Router DOM 7 | Client-side routing |
| React Bootstrap 5 | UI components and grid |
| Firebase 12 | Authentication, Firestore (cart, orders, profile) |
| Mapbox GL | Store locator map |
| Gemini 2.5 Flash | AI support assistant (`/help`) |
| Axios | HTTP requests to backend |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | REST API server |
| MongoDB + Mongoose | Products and reviews database |
| Supabase Storage | Product image storage |
| Multer | File upload handling |
| dotenv | Environment variables |

---

## Project Structure

```
NikeSite/
└── FULLSTACK/
    ├── backend/
    │   ├── index.js              # Express server, all API routes
    │   ├── migrate.js            # Initial data migration
    │   ├── migrate-discount.js   # Discount migration
    │   └── migrate-sizes.js      # Sizes migration
    │
    └── frontend/
        └── src/
            ├── App.jsx           # Root component, all routes
            ├── Context.jsx       # Global state (products, backendUrl)
            ├── server/
            │   ├── firebase.js   # Firebase configuration
            │   └── aiasist.js    # Gemini AI logic (key rotation)
            └── components/
                ├── header/       # Site header with logo and navigation
                ├── footer/       # Footer with links
                ├── card/         # Product card, favorites card
                ├── stores-map/   # Mapbox store locator
                └── pages/
                    ├── product/          # Product page with reviews
                    ├── bag/              # Shopping cart
                    ├── checkout/         # Order checkout
                    ├── UserProfile/      # Profile (orders, reviews)
                    │   └── bar/
                    │       ├── Orders.jsx
                    │       └── Comments.jsx
                    ├── admin/            # Admin panel
                    │   ├── Admin.jsx     # Dashboard with stats
                    │   ├── Products.jsx  # Product list
                    │   ├── Addproduct.jsx
                    │   ├── Orders.jsx
                    │   └── Consumers.jsx
                    ├── Help/             # AI support chat
                    ├── log-in/           # Login, register, password reset
                    ├── SearchResults.jsx
                    └── error/            # 404 page
```

---

## Client Routes

| Route | Page |
|---|---|
| `/` | Home / catalog |
| `/product/:id` | Product page with reviews |
| `/shopping_bag` | Shopping cart |
| `/checkout` | Order checkout |
| `/favorites` | Saved items |
| `/search` | Catalog search |
| `/find-a-store` | Store locator map |
| `/profile` | User profile |
| `/help` | AI assistant |
| `/login` | Login |
| `/register` | Registration |
| `/forgot-password` | Password reset |
| `/admin-page` | Admin dashboard |
| `/admin-page/products` | Product management |
| `/admin-page/add-product` | Add product |
| `/admin-page/orders` | Orders (admin) |
| `/admin-page/users` | Users (admin) |

---

## API (backend — port 4200)

### Products (public)

| Method | Route | Description |
|---|---|---|
| `GET` | `/products` | All products (with filtering) |
| `GET` | `/products/:id` | Single product by MongoDB `_id` |
| `PUT` | `/products` | Update product fields |
| `PUT` | `/products/review` | Add a review to a product |

### Products (admin)

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/admin/products` | All products |
| `GET` | `/api/admin/products/:id` | Single product |
| `POST` | `/api/admin/products` | Create product (upload images to Supabase) |
| `DELETE` | `/api/admin/products/:id` | Delete product |
| `GET` | `/api/admin/stats` | Total product count from MongoDB |
| `GET` | `/api/admin/discounts` | Discount list |
| `POST` | `/api/admin/discounts` | Add discount |

---

## Mongoose Product Schema

```js
{
  tovarName: String,       // product name
  tovarClass: String,      // category (shoes, hoodie, etc.)
  tovarPrice: String,      // price
  color: String,           // color
  sizes: [String],         // available sizes
  discount: Number,        // discount percentage
  images: [{ url, filename }], // Supabase photos
  reviews: [{
    userId: String,
    user: String,
    comment: String,
    rating: Number,
    date: Date
  }]
}
```

---

## Firebase (Firestore)

| Collection | Stored data |
|---|---|
| `users/{uid}` | Contact info, address, `bagElements`, `favorites` |
| `orders` | Orders with `userId`, `items`, `total`, `status`, `createdAt` |

---

## Environment Setup

### Backend — `FULLSTACK/backend/.env`

```env
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/<db>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<anon-key>
PORT=4200
```

### Frontend — `FULLSTACK/frontend/.env`

```env
# Backend
REACT_APP_BACKEND_URL=http://localhost:4200

# Firebase
REACT_APP_REACT_API_KEY=
REACT_APP_REACT_AUTH_DOMAIN=
REACT_APP_REACT_PROJECT_ID=
REACT_APP_REACT_STORAGE_BUCKET=
REACT_APP_REACT_MESSAGER_SENDING_ID=
REACT_APP_REACT_APP_ID=

# Mapbox
REACT_APP_MAPBOX_ACCESS_TOKEN=

# Gemini AI (up to 5 keys with automatic rotation on rate limit)
REACT_APP_GEMINI_AI_KEY=
REACT_APP_GEMINI_AI_KEY_ALT_1=
REACT_APP_GEMINI_AI_KEY_ALT_2=
REACT_APP_GEMINI_AI_KEY_ALT_3=
REACT_APP_GEMINI_AI_KEY_ALT_4=
```

---

## Running the Project

### Backend
```bash
cd FULLSTACK/backend
npm install
npm run dev        # nodemon index.js
```

### Frontend
```bash
cd FULLSTACK/frontend
npm install
npm start          # http://localhost:3000
```

---

## Key Features

- **AI Support Assistant** — Gemini 2.5 Flash reads the GitHub repository and answers questions about products, navigation, and store locations. Supports rotation across up to 5 API keys when rate limits are hit.
- **Product Images** — stored in Supabase Storage, returned as an `images[{url, filename}]` array.
- **Reviews** — stored in MongoDB alongside the product, sorted newest first. Displayed in the user profile with the product image.
- **Orders** — saved in Firestore with a full snapshot of products at the time of purchase.
- **Admin Panel** — order and product count statistics are fetched directly from MongoDB (`countDocuments`), not Firestore.

---

## Notes

- This project is an **unofficial educational clone** of Nike and is not a commercial product.
- The Nike logo and brand name are used for educational purposes only.
- `products.json` in the backend is used by the AI assistant for catalog search.
