import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

console.log("Testing MongoDB connection...");
console.log("URI (masked):", MONGODB_URI?.replace(/\/\/.*@/, "//***:***@"));

async function testConnection() {
  try {
    console.log("Attempting to connect...");

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("✅ MongoDB connected successfully!");

    const testSchema = new mongoose.Schema({ test: String });
    const TestModel = mongoose.model("Test", testSchema);

    const doc = new TestModel({ test: "connection test" });
    await doc.save();
    console.log("✅ Test document saved successfully!");

    await TestModel.deleteOne({ _id: doc._id });
    console.log("✅ Test document deleted successfully!");
  } catch (error) {
    console.error("❌ Connection failed:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);

    if (error.name === "MongoServerSelectionError") {
      console.error("\n🔍 Troubleshooting tips:");
      console.error(
        "1. Check if your IP is whitelisted in MongoDB Atlas Network Access",
      );
      console.error("2. Verify your username and password are correct");
      console.error("3. Ensure your cluster is running and accessible");
    }
  } finally {
    await mongoose.disconnect();
    console.log("Connection test completed.");
  }
}

testConnection();
