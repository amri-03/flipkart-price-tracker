import dotenv from "dotenv";
import path from "path";

// Locate and load environmental variables from the backend root
dotenv.config({ path: path.join(__dirname, "../.env") });

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
export const NODE_ENV = process.env.NODE_ENV || "development";
