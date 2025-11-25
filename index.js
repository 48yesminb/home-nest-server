const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceKey.json");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pr2cgda.mongodb.net/homeNestDB?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

let propertyCollection;
let ratingsCollection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("homeNestDB");
    propertyCollection = db.collection("properties");
    ratingsCollection = db.collection("ratings");
    console.log("MongoDB Connected Successfully");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}

connectDB();

//  Firebase Token Verification 
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Forbidden", error: err.message });
  }
};

//  Properties Routes 


app.get("/properties", async (req, res) => {
  try {
    const email = req.query.email;
    const search = req.query.search;
    let query = {};

    if (email) query.userEmail = email;
    if (search) query.title = { $regex: search, $options: "i" };

    const result = await propertyCollection.find(query).sort({ createdAt: -1 }).toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/properties/:id", async (req, res) => {
  try {
    const property = await propertyCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!property) return res.status(404).json({ message: "Property not found" });
    res.json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add property 
app.post("/properties", verifyToken, async (req, res) => {
  try {
    const { title, description, category, price, location, image } = req.body;

    const property = {
      title,
      description,
      category,
      price,
      location,
      image,
      userEmail: req.user.email,
      userName: req.user.name || req.user.email,
      createdAt: new Date().toISOString()
    };

    const result = await propertyCollection.insertOne(property);
    res.status(201).json({ message: "Property added successfully", property: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update property 
app.patch("/properties/:id", verifyToken, async (req, res) => {
  try {
    const property = await propertyCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (property.userEmail !== req.user.email)
      return res.status(403).json({ message: "You cannot edit this property" });

    const updateData = req.body;
    const result = await propertyCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );
    res.json({ message: "Property updated successfully", result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete property
app.delete("/properties/:id", verifyToken, async (req, res) => {
  try {
    const property = await propertyCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!property) return res.status(404).json({ message: "Property not found" });
    if (property.userEmail !== req.user.email)
      return res.status(403).json({ message: "You cannot delete this property" });

    const result = await propertyCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: "Property deleted successfully", result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// rating 
app.post("/ratings", verifyToken, async (req, res) => {
  try {
    const { propertyId, propertyName, stars, reviewText } = req.body;

    const rating = {
      propertyId,
      propertyName,
      stars,
      reviewText,
      reviewerName: req.user.name || req.user.email,
      reviewerEmail: req.user.email,
      createdAt: new Date().toISOString()
    };

    const result = await ratingsCollection.insertOne(rating);
    res.status(201).json({ message: "Rating added successfully", rating: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//  ratings property
app.get("/ratings/property/:id", async (req, res) => {
  try {
    const ratings = await ratingsCollection.find({ propertyId: req.params.id }).sort({ createdAt: -1 }).toArray();
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/ratings", async (req, res) => {
  try {
    const email = req.query.email;
    const query = email ? { reviewerEmail: email } : {};
    const ratings = await ratingsCollection.find(query).sort({ createdAt: -1 }).toArray();
    res.json(ratings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete rating 
app.delete("/ratings/:id", verifyToken, async (req, res) => {
  try {
    const rating = await ratingsCollection.findOne({ _id: new ObjectId(req.params.id) });
    if (!rating) return res.status(404).json({ message: "Rating not found" });
    if (rating.reviewerEmail !== req.user.email)
      return res.status(403).json({ message: "You cannot delete this rating" });

    const result = await ratingsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: "Rating deleted successfully", result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//  Home Route 
app.get("/", (req, res) => {
  res.send("Home Nest Server is running successfully");
});

// 404 Route
app.use((req, res) => {
  res.status(404).json({ message: "Route Not Found" });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
