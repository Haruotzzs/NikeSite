import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import multer from "multer";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4200;
const BASE_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
const UPLOAD_DIR = path.resolve("./uploads/products");

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ===== MONGOOSE SCHEMA =====
const productSchema = new mongoose.Schema(
  {
    tovarName: { type: String, required: true },
    tovarClass: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    sizes: [{ type: String }],
    variants: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      mainImage: { type: String },
      price: { type: Number }
    }],
    discount: { type: Number, default: 0, min: 0, max: 100 },
    images: [
      {
        filename: { type: String },
        url: { type: String },
      },
    ],
    reviews: [
      {
        userId: { type: String },
        user: { type: String },
        comment: { type: String },
        rating: { type: Number },
        date: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

// ===== DISCOUNT SCHEMA =====
const discountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    type: { 
      type: String, 
      enum: ['percentage', 'fixed'], 
      required: true 
    }, // percentage або fixed
    value: { type: Number, required: true }, 
    applicableTo: {
      type: String,
      enum: ['all', 'category', 'product'],
      default: 'all'
    }, 
    category: { type: String }, 
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], 
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },
    createdBy: { type: String }, 
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Discount = mongoose.model("Discount", discountSchema);

// ===== MULTER CONFIG =====
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// ===== STATIC FILES =====
app.use("/uploads", express.static(path.resolve("./uploads")));

// ===== ADMIN PRODUCTS API =====
// POST: Add a new product with files
app.post("/api/admin/products", upload.array("images", 10), async (req, res) => {
  try {
    const { tovarName, tovarClass, price, description, sizes, variants, discount } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images uploaded" });
    }

    if (!tovarName || !tovarClass || !price || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const images = req.files.map((file) => ({
      filename: file.filename,
      url: `${BASE_URL}/uploads/products/${file.filename}`,
    }));

    const newProduct = new Product({
      tovarName,
      tovarClass,
      price: Number(price),
      description,
      sizes: sizes ? JSON.parse(sizes) : [], 
      variants: variants ? JSON.parse(variants) : [], 
      discount: discount ? Number(discount) : 0,
      images,
    });

    const savedProduct = await newProduct.save();

    res.status(201).json({
      message: "Product added successfully!",
      product: savedProduct,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
});

// GET: Get all products
app.get("/api/admin/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET: Get product by ID
app.get("/api/admin/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE: Delete a product
app.delete("/api/admin/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    for (const image of product.images) {
      try {
        const filePath = path.join(UPLOAD_DIR, image.filename);
        await fs.unlink(filePath);
      } catch (err) {
      }
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update fields
app.put("/api/admin/products/:id", upload.array("images", 10), async (req, res) => {
  try {
    const { tovarName, tovarClass, price, description, sizes, variants, discount } = req.body;
    const productId = req.params.id;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Get all products
    if (tovarName) product.tovarName = tovarName;
    if (tovarClass) product.tovarClass = tovarClass;
    if (price) product.price = Number(price);
    if (description) product.description = description;
    if (sizes) product.sizes = JSON.parse(sizes);
    if (variants) product.variants = JSON.parse(variants);
    if (discount !== undefined) product.discount = Number(discount);

    // If there are new images, add them
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => ({
        filename: file.filename,
        url: `${BASE_URL}/uploads/products/${file.filename}`,
      }));
      product.images.push(...newImages);
    }

    const updatedProduct = await product.save();

    res.json({
      message: "Product updated successfully!",
      product: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Server error" });
  }
});

// ===== PUBLIC PRODUCTS API =======
app.get("/products", async (req, res) => {
  try {
    const searchQuery = req.query.q;
    const products = await Product.find();

    if (!searchQuery) {
      return res.json(products);
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = products.filter(
      (p) =>
        p.tovarName?.toLowerCase().includes(query) ||
        p.tovarClass?.toLowerCase().includes(query)
    );

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: "Server error during search" });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// POST: Add a product review
app.post("/products/:id/review", async (req, res) => {
  try {
    const { userId, user, comment, rating } = req.body;
    
    if (!userId || !user || !comment || !rating) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Initialize reviews as an array if it doesn't exist
    if (!Array.isArray(product.reviews)) {
      product.reviews = [];
    }

    const newReview = {
      userId,
      user,
      comment,
      rating: Number(rating),
      date: new Date(),
    };

    product.reviews.push(newReview);
    await product.save();

    res.status(201).json({ message: "Review added successfully", review: newReview });
  } catch (error) {
    console.error("Review error:", error);
    res.status(500).json({ error: error.message || "Server error" });
  }
});

// ===== DISCOUNT API =====
// GET: Get all discounts
app.get("/api/admin/discounts", async (req, res) => {
  console.log("GET /api/admin/discounts called");
  try {
    const discounts = await Discount.find().sort({ createdAt: -1 });
    console.log("Found discounts:", discounts.length);
    res.json(discounts);
  } catch (error) {
    console.error("Error fetching discounts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// GET: Get a single discount
app.get("/api/admin/discounts/:id", async (req, res) => {
  try {
    const discount = await Discount.findById(req.params.id);
    if (!discount) {
      return res.status(404).json({ error: "Discount not found" });
    }
    res.json(discount);
  } catch (error) {
    console.error("Error fetching discount:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST: Create a new discount
app.post("/api/admin/discounts", async (req, res) => {
  try {
    const { name, description, type, value, applicableTo, category, productIds, startDate, endDate, usageLimit } = req.body;

    if (!name || !type || !value) {
      return res.status(400).json({ error: "Missing required fields: name, type, value" });
    }

    if (type === 'percentage' && (value < 0 || value > 100)) {
      return res.status(400).json({ error: "Percentage discount must be between 0 and 100" });
    }

    const newDiscount = new Discount({
      name,
      description,
      type,
      value: Number(value),
      applicableTo: applicableTo || 'all',
      category: applicableTo === 'category' ? category : undefined,
      productIds: applicableTo === 'product' ? productIds : [],
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
    });

    const savedDiscount = await newDiscount.save();
    res.status(201).json({
      message: "Discount created successfully!",
      discount: savedDiscount,
    });
  } catch (error) {
    console.error("Error creating discount:", error);
    res.status(500).json({ error: error.message || "Server error" });
  }
});

// PUT: Update a discount
app.put("/api/admin/discounts/:id", async (req, res) => {
  try {
    const { name, description, type, value, applicableTo, category, productIds, isActive, startDate, endDate, usageLimit } = req.body;
    const discountId = req.params.id;

    const discount = await Discount.findById(discountId);
    if (!discount) {
      return res.status(404).json({ error: "Discount not found" });
    }

    // Update fields
    if (name) discount.name = name;
    if (description !== undefined) discount.description = description;
    if (type) discount.type = type;
    if (value !== undefined) discount.value = Number(value);
    if (applicableTo) discount.applicableTo = applicableTo;
    if (applicableTo === 'category' && category) discount.category = category;
    if (applicableTo === 'product' && productIds) discount.productIds = productIds;
    if (isActive !== undefined) discount.isActive = isActive;
    if (startDate) discount.startDate = new Date(startDate);
    if (endDate) discount.endDate = new Date(endDate);
    if (usageLimit !== undefined) discount.usageLimit = Number(usageLimit);

    const updatedDiscount = await discount.save();
    res.json({
      message: "Discount updated successfully!",
      discount: updatedDiscount,
    });
  } catch (error) {
    console.error("Error updating discount:", error);
    res.status(500).json({ error: error.message || "Server error" });
  }
});

// DELETE: Delete a discount
app.delete("/api/admin/discounts/:id", async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) {
      return res.status(404).json({ error: "Discount not found" });
    }

    res.json({ message: "Discount deleted successfully" });
  } catch (error) {
    console.error("Error deleting discount:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// POST: Upload user avatar
app.post("/api/upload-avatar", async (req, res) => {
  try {
    const { userId, image } = req.body;

    if (!image) return res.status(400).json({ error: "Немає даних зображення" });

    const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    const type = matches[1].split("/")[1];
    const buffer = Buffer.from(matches[2], "base64");

    const fileName = `avatar-${userId}.${type}`;
    const uploadPath = path.resolve("./uploads/avatars", fileName);

    await fs.mkdir(path.dirname(uploadPath), { recursive: true });
    await fs.writeFile(uploadPath, buffer);

    const imageUrl = `${BASE_URL}/uploads/avatars/${fileName}`;
    res.json({ url: imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Помилка збереження файлу" });
  }
});

// ===== START SERVER =====
async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected!");

    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Add product: POST http://localhost:${PORT}/api/admin/products`);
      console.log(`Search products: GET http://localhost:${PORT}/products?q=search`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum 10 files.' });
    }
    return res.status(400).json({ error: 'File upload error.' });
  }
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({ error: 'Only image files are allowed.' });
  }
  res.status(500).json({ error: error.message || 'Server error' });
});

start();