const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());




  const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pr2cgda.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// 🔹 Connect to MongoDB
async function run() {
  try {
    await client.connect();
    const db = client.db("homeNestDB");

    //  Collections
    const propertyCollection = db.collection("properties");
    const ratingsCollection = db.collection("ratings");

    
    app.get("/properties", async (req, res) => {
      const cursor = propertyCollection.find().
    });

    app.get("/properties/:id", async (req, res) => {
      const { id } = req.params;
      const property = await propertyCollection.findOne({ _id: new ObjectId(id) });
      res.send(property);
    });

    //  new property
    app.post("/properties", async (req, res) => {
      const property = req.body;
      const result = await propertyCollection.insertOne(property);
      res.send(result);
    });

    
    app.patch("/properties/:id", async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;
      const result = await propertyCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData }
      );
      res.send(result);
    });

    //  Delete property
    app.delete("/properties/:id", async (req, res) => {
      const { id } = req.params;
      const result = await propertyCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Rating propeerty

    
    app.post("/ratings", async (req, res) => {
      const rating = req.body;
      const result = await ratingsCollection.insertOne(rating);
      res.send(result);
    });

    //  all ratings 
    app.get("/ratings", async (req, res) => {
      const email = req.query.email;
      const query = email ? { userEmail: email } : {};
      const result = await ratingsCollection.find(query).sort({ _id: -1 }).toArray();
      res.send(result);
    });

    // specific property
    app.get("/ratings/property/:id", async (req, res) => {
      const propertyId = req.params.id;
      const result = await ratingsCollection
        .find({ propertyId: propertyId })
        .toArray();
      res.send(result);
    });

    //  Delete a rating (optional)
    app.delete("/ratings/:id", async (req, res) => {
      const id = req.params.id;
      const result = await ratingsCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    console.log("MongoDB Connected Successfully");
  } catch (err) {
    console.error(" MongoDB Connection Error:", err);
  }
}

run().catch(console.dir);

// Root route
app.get("/", (req, res) => {
  res.send(" Home Nest Server is running successfully");
});

// Start server
app.listen(port, () => {
  console.log(` Server running at http://localhost:${port}`);
});
