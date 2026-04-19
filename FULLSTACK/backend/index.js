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
    sizes: [{ type: String }],
    variants: [{
        id: { type: String, required: true },
        name: { type: String, required: true },
        mainImage: { type: String },
        price: { type: Number }
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
        const { tovarName, tovarClass, price, description, sizes, variants, discount } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "At least one image is required" });
        }

        // Upload all files to Supabase in parallel
        const uploadPromises = req.files.map(file => uploadToSupabase(file));
        const uploadedImages = await Promise.all(uploadPromises);

        const newProduct = new Product({
            tovarName,
            tovarClass,
            price: Number(price),
            description,
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



const deleteFromSupabase = async (filePaths) => {
    try {
        if (!filePaths || filePaths.length === 0) return;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove(filePaths);

        if (error) {
            console.error("Помилка видалення з Supabase:", error.message);
            throw error;
        }

        console.log("Файли успішно видалені з Supabase:", data);
        return data;
    } catch (error) {
        console.error("Системна помилка при видаленні:", error);
    }
};

app.put("/api/admin/products/:id", upload.array("images", 10), async (req, res) => {
  try {
    const productId = req.params.id;
    const { 
      tovarName, tovarClass, price, description, 
      sizes, variants, discount, 
      imageToPrimaryIndex,
      remainingImages 
    } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // 1. СПОЧАТКУ ВИДАЛЕННЯ (Фізичне та з масиву)
    if (remainingImages) {
      const keptImages = JSON.parse(remainingImages);
      
      // Шукаємо файли, які треба видалити з Supabase
      const imagesToRemove = product.images.filter(
        oldImg => !keptImages.some(newImg => newImg.filename === oldImg.filename)
      );

      if (imagesToRemove.length > 0) {
        const filePaths = imagesToRemove.map(img => img.filename);
        await deleteFromSupabase(filePaths); // Викликаємо вашу функцію видалення
      }
      
      // Оновлюємо масив у моделі тими, що залишилися
      product.images = keptImages;
    }

    // 2. ПОТІМ ДОДАВАННЯ НОВИХ (Якщо є)
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadToSupabase(file));
      const uploadedImages = await Promise.all(uploadPromises);
      
      // Використовуємо поширення, щоб додати нові об'єкти {filename, url}
      product.images.push(...uploadedImages);
    }

    // 3. ОНОВЛЕННЯ ТЕКСТОВИХ ПОЛІВ
    if (tovarName) product.tovarName = tovarName;
    if (tovarClass) product.tovarClass = tovarClass;
    if (price) product.price = Number(price);
    if (description) product.description = description;
    if (discount !== undefined) product.discount = Number(discount);
    
    if (sizes) product.sizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
    if (variants) product.variants = typeof variants === "string" ? JSON.parse(variants) : variants;

    // 4. СОРТУВАННЯ (Після того, як масив зібрав усі старі та нові фото)
    if (imageToPrimaryIndex !== undefined && imageToPrimaryIndex !== "") {
      const idx = parseInt(imageToPrimaryIndex);
      
      if (!isNaN(idx) && idx >= 0 && idx < product.images.length) {
        const [movedImage] = product.images.splice(idx, 1);
        product.images.unshift(movedImage);
        
        // Повідомляємо Mongoose, що масив змінено, інакше сортування може не зберегтися
        product.markModified('images');
      }
    }

    // 5. ЗБЕРЕЖЕННЯ
    const updatedProduct = await product.save();

    res.json({ 
      message: "Product updated successfully!", 
      product: updatedProduct 
    });

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// DELETE: Remove product and clean up images in Supabase
app.delete("/api/admin/products/:id", async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: "Product not found" });

        // Extract filenames/paths for Supabase deletion
        const filePaths = product.images.map(img => img.filename);
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

// POST: Add review to a  product
app.post("/products/:id/review", async (req, res) => {
    try {
        const { userId, user, comment, rating } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: "Product not found" });

        product.reviews.push({ userId, user, comment, rating: Number(rating) });
        await product.save();
        res.status(201).json({ message: "Review added" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== USER AVATAR (Base64 to Supabase) =====
app.post("/api/upload-avatar", async (req, res) => {
    try {
        const { userId, image } = req.body; // Expects base64 data url
        if (!image) return res.status(400).json({ error: "No image data provided" });

        const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        const fileName = `avatars/user-${userId}-${Date.now()}.png`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(fileName, buffer, { contentType, upsert: true });

        if (error) throw error;

        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
        res.json({ url: urlData.publicUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
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
        // 1. Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Database Connected: MongoDB");

        // 2. Check Supabase Connection
        // We try to list buckets to verify if the SUPABASE_KEY and URL are correct
        const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
        
        if (storageError) {
            throw new Error(`Supabase Storage error: ${storageError.message}`);
        }

        // Check if our specific bucket exists
        const bucketExists = buckets.find(b => b.name === BUCKET_NAME);
        if (!bucketExists) {
            console.warn(`Warning: Bucket "${BUCKET_NAME}" not found. Please create it in Supabase dashboard.`);
        } else {
            console.log(`Supabase Connected: Bucket "${BUCKET_NAME}" is ready.`);
        }

        // 3. Start Express Server
        app.listen(PORT, () => {
            console.log(`Server running on: http://localhost:${PORT}`);
            console.log(`Ready to receive requests`);
        });
    } catch (error) {
        console.error("Startup Error:", error.message);
        process.exit(1); // Stop the process if connection fails
    }
};

// Global Error Handler for Multer and General Errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload Error: ${err.message}` });
    }
    res.status(500).json({ error: err.message || "Internal Server Error" });
});

start();