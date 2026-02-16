import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4200;
const DB_PATH = path.resolve("./server/store/products.json");

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// ===== HELPER FUNCTIONS =====

async function readProducts() {
    try {
        const data = await fs.readFile(DB_PATH, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Помилка читання файлу:", error);
        return []; 
    }
}

async function writeProducts(products) {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(products, null, 2), "utf-8");
    } catch (error) {
        console.error("Помилка запису у файл:", error);
        throw new Error("Failed to write to database");
    }
}

// ===== PRODUCTS API =====

/**
 * Отримати товари (з підтримкою пошуку)
 * Ендпоінт: GET /products?q=nike
 */
app.get("/products", async (req, res) => {
    try {
        const products = await readProducts();
        const searchQuery = req.query.q;

        if (!searchQuery) {
            return res.json(products);
        }

        // Логіка фільтрації
        const query = searchQuery.toLowerCase();
        const filtered = products.filter(p => 
            p.tovarName?.toLowerCase().includes(query) || 
            p.tovarClass?.toLowerCase().includes(query) 
        );

        res.json(filtered);
    } catch (error) {
        res.status(500).json({ error: "Server error during search" });
    }
});

// Отримати один товар за ID
app.get("/products/:id", async (req, res) => {
    const id = Number(req.params.id);
    const products = await readProducts();
    const product = products.find(p => p.id === id);
    
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Перетворюємо productImg на масив, якщо це об'єкт
    let images = [];
    if (typeof product.productImg === 'object' && product.productImg !== null) {
        images = Object.values(product.productImg); 
    } else {
        images = [product.productImg]; // Перетворюємо поодиноке посилання на масив
    }

    res.json({ ...product, productImg: images });
});

// Додати новий товар
// ... (інший код без змін)

app.get("/products", async (req, res) => {
    try {
        const products = await readProducts();
        const searchQuery = req.query.q;

        if (!searchQuery) {
            return res.json(products);
        }

        const query = searchQuery.toLowerCase().trim();
        
        const filtered = products.filter(p => {
            // Шукаємо ТІЛЬКИ в текстових полях, які бачить користувач
            const nameMatch = p.tovarName?.toLowerCase().includes(query);
            const classMatch = p.tovarClass?.toLowerCase().includes(query);
            
            // Виключаємо пошук по productImg, щоб не рендерити все підряд
            return nameMatch || classMatch;
        });

        res.json(filtered);
    } catch (error) {
        res.status(500).json({ error: "Server error during search" });
    }
});

app.post("/products/:id", async (req, res) => {
    try {
        const productId = Number(req.params.id);
        const { userId, user, comment, rating } = req.body; // Додаємо userId

        const products = await readProducts();
        const productIndex = products.findIndex(p => p.id === productId);

        if (productIndex === -1) return res.status(404).json({ error: "Product not found" });

        if (!products[productIndex].reviews) products[productIndex].reviews = [];

        // ПЕРЕВІРКА: Чи є вже відгук від цього користувача?
        const alreadyReviewed = products[productIndex].reviews.some(r => r.userId === userId);
        if (alreadyReviewed) {
            return res.status(403).json({ error: "Ви вже залишили відгук для цього товару" });
        }

        const newReview = {
            userId, // Зберігаємо ID для майбутніх перевірок
            user,
            comment,
            rating: Number(rating),
            date: new Date()
        };

        products[productIndex].reviews.push(newReview);
        await writeProducts(products);

        res.status(201).json({ message: "Review added successfully", review: newReview });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Додайте на початку сервера, якщо ще немає:
app.use("/uploads", express.static(path.resolve("./uploads")));

app.post("/api/upload-avatar", async (req, res) => {
    try {
        const { userId, image } = req.body;

        if (!image) return res.status(400).json({ error: "Немає даних зображення" });

        // 1. Витягуємо розширення та чисті дані (скидаємо префікс "data:image/png;base64,")
        const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        const type = matches[1].split('/')[1]; // напр. 'png' або 'jpeg'
        const buffer = Buffer.from(matches[2], 'base64'); // Перетворюємо текст назад у бінарний файл

        // 2. Створюємо шлях та папку
        const fileName = `avatar-${userId}.${type}`;
        const uploadPath = path.resolve("./uploads/avatars", fileName);
        
        await fs.mkdir(path.dirname(uploadPath), { recursive: true });

        // 3. Записуємо файл на диск
        await fs.writeFile(uploadPath, buffer);

        const imageUrl = `http://localhost:${PORT}/uploads/avatars/${fileName}`;
        res.json({ url: imageUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Помилка збереження файлу" });
    }
});


// ===== START SERVER =====
async function start() {
    try {
        const dir = path.dirname(DB_PATH);
        await fs.mkdir(dir, { recursive: true });

        try {
            await fs.access(DB_PATH);
        } catch {
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), "utf-8");
            console.log("📝 Створено новий файл бази даних.");
        }
        
        app.listen(PORT, () => {
            console.log(`Server: http://localhost:${PORT}`);
            console.log(`Search test: http://localhost:${PORT}/products?q=test`);
        });
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

start();