import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4200;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const BUCKET_NAME = "products";

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ===== MONGOOSE SCHEMAS =====
const productSchema = new mongoose.Schema({
    tovarName: { type: String, required: true },
    tovarClass: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String, required: true },
    color: { type: String, default: "" },
    sizes: [{ type: String }],
    variants: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        mainImage: { type: String },
        price: { type: Number },
        color: { type: String }
    }],
    discount: { type: Number, default: 0, min: 0, max: 100 },
    images: [{
        filename: { type: String }, // Stores the path/name in Supabase bucket
        url: { type: String },      // Stores the public URL
    }],
    reviews: [{
        userId: { type: String },
        user: { type: String },
        comment: { type: String },
        rating: { type: Number },
        date: { type: Date, default: Date.now },
    }],
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

const discountSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true },
    applicableTo: { type: String, enum: ['all', 'category', 'product'], default: 'all' },
    category: { type: String },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    isActive: { type: Boolean, default: true },
    startDate: { type: Date },
    endDate: { type: Date },
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },
}, { timestamps: true });

const Discount = mongoose.model("Discount", discountSchema);

// ===== MULTER CONFIGURATION (Memory Storage) =====
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Only image files are allowed"), false);
    },
});

// ===== SUPABASE UPLOAD HELPER =====
const uploadToSupabase = async (file, folder = "products") => {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.floor(Math.random() * 1e9)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false
        });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    return {
        filename: filePath,
        url: publicUrlData.publicUrl
    };
};

// ===== ADMIN PRODUCT ROUTES =====

// POST: Create a new product with multiple images
app.post("/api/admin/products", upload.array("images", 10), async (req, res) => {
    try {
        const { tovarName, tovarClass, price, description, color, sizes, variants, discount } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "At least one image is required" });
        }

        const uploadPromises = req.files.map(file => uploadToSupabase(file));
        const uploadedImages = await Promise.all(uploadPromises);

        const newProduct = new Product({
            tovarName,
            tovarClass,
            price: Number(price),
            description,
            color: color || "",
            sizes: sizes ? JSON.parse(sizes) : [],
            variants: variants ? JSON.parse(variants) : [],
            discount: discount ? Number(discount) : 0,
            images: uploadedImages
        });

        await newProduct.save();
        res.status(201).json({ message: "Product created successfully", product: newProduct });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Fetch product details for admin
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


// PUT: Update product — correctly merges existing (reordered) + new uploaded images
app.put("/products", async (req, res) => {
    try {
        const productId = req.params.id;
        const { tovarName, tovarClass, price, description, color, sizes, variants, discount, existingImages } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // ── STEP 1: Parse the existing image URLs sent by the frontend.
        // These are already-uploaded images the user kept, in their new order
        // (reordering on the frontend is reflected here).
        let keptImageUrls = [];
        try {
            keptImageUrls = existingImages ? JSON.parse(existingImages) : [];
        } catch {
            keptImageUrls = [];
        }

        // ── STEP 2: Map kept URLs back to full image objects (filename + url)
        // so we preserve the Supabase filename for future deletion if needed.
        const keptImages = keptImageUrls.map(url => {
            const found = product.images.find(img => img.url === url);
            // If found in DB, keep the full object; otherwise store url-only fallback
            return found ? found : { filename: null, url };
        });

        // ── STEP 3: Find images that were removed by the user and delete them
        // from Supabase storage to avoid orphaned files.
        const removedImages = product.images.filter(
            img => !keptImageUrls.includes(img.url)
        );
        if (removedImages.length > 0) {
            const pathsToDelete = removedImages
                .map(img => img.filename)
                .filter(Boolean); // skip any without a stored filename
            if (pathsToDelete.length > 0) {
                await supabase.storage.from(BUCKET_NAME).remove(pathsToDelete);
            }
        }

        // ── STEP 4: Upload any new files the user added during editing.
        let newlyUploadedImages = [];
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => uploadToSupabase(file));
            newlyUploadedImages = await Promise.all(uploadPromises);
        }

        // ── STEP 5: Final image array = kept images (in their new order) + new uploads appended.
        const finalImages = [...keptImages, ...newlyUploadedImages];

        // ── STEP 6: Update all product fields
        product.tovarName = tovarName || product.tovarName;
        product.tovarClass = tovarClass || product.tovarClass;
        product.price = price ? Number(price) : product.price;
        product.description = description || product.description;
        product.color = color !== undefined ? color : product.color;
        product.sizes = sizes ? JSON.parse(sizes) : product.sizes;
        product.variants = variants ? JSON.parse(variants) : product.variants;
        product.discount = discount !== undefined ? Number(discount) : product.discount;
        product.images = finalImages;

        const updatedProduct = await product.save();

        res.json({
            message: "Product updated successfully",
            product: updatedProduct
        });

    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ error: error.message });
    }
});

// REVIEWS PUT
app.put("/products", async (req, res) => {
    try {
        const {
            productId,
            userId,
            user,
            comment,
            rating
        } = req.body;

        // шукаємо продукт по Mongo _id
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                error: "Product not found"
            });
        }

        // новий review строго під твою схему
        const newReview = {
            userId,
            user,
            comment,
            rating,
            date: new Date()
        };

        // додаємо в масив reviews (НЕ змінює структуру документа)
        product.reviews.push(newReview);

        await product.save();

        res.status(200).json({
            message: "Review added successfully",
            reviews: product.reviews
        });

    } catch (error) {
        console.error("Review error:", error);

        res.status(500).json({
            error: error.message
        });
    }
});

// DELETE: Remove product and clean up images in Supabase
app.delete("/api/admin/products/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: "Product not found" });

        const filePaths = product.images.map(img => img.filename).filter(Boolean);
        if (filePaths.length > 0) {
            await supabase.storage.from(BUCKET_NAME).remove(filePaths);
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Product and associated images deleted" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET: Fetch all products for admin
app.get("/api/admin/products", async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch products" });
    }
});

// ===== PUBLIC PRODUCT ROUTES =====

// GET: Public search/list
app.get("/products", async (req, res) => {
    try {
        const { q } = req.query;
        let filter = {};
        if (q) {
            filter = {
                $or: [
                    { tovarName: { $regex: q, $options: "i" } },
                    { tovarClass: { $regex: q, $options: "i" } }
                ]
            };
        }
        const products = await Product.find(filter);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: "Search failed" });
    }
});

// ===== DISCOUNT MANAGEMENT =====
app.post("/api/admin/discounts", async (req, res) => {
    try {
        const discount = new Discount(req.body);
        await discount.save();
        res.status(201).json(discount);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/admin/discounts", async (req, res) => {
    try {
        const discounts = await Discount.find().sort({ createdAt: -1 });
        res.json(discounts);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch discounts" });
    }
});

// ===== SERVER INITIALIZATION =====
const start = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Database Connected: MongoDB");

        const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
        if (storageError) {
            throw new Error(`Supabase Storage error: ${storageError.message}`);
        }

        const bucketExists = buckets.find(b => b.name === BUCKET_NAME);
        if (!bucketExists) {
            console.warn(`Warning: Bucket "${BUCKET_NAME}" not found. Please create it in Supabase dashboard.`);
        } else {
            console.log(`Supabase Connected: Bucket "${BUCKET_NAME}" is ready.`);
        }

        app.listen(PORT, () => {
            console.log(`Server running on: http://localhost:${PORT}`);
            console.log(`Ready to receive requests`);
        });
    } catch (error) {
        console.error("Startup Error:", error.message);
        process.exit(1);
    }
};

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload Error: ${err.message}` });
    }
    res.status(500).json({ error: err.message || "Internal Server Error" });
});

start();