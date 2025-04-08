import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import passport from "passport";
import router from "./Routes/index.js";
import dbConnection from "./config/db.js";
import { app, server } from "./socket/index.js";

dotenv.config();

const PORT = process.env.PORT;

const corsOptions = {
  origin: [process.env.CLIENT],
  credentials: true,  methods: ["GET", "POST"],

  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use("/api/v1", router);

// dbConnection().then(() => {
  server.listen(PORT, () => {
    console.log("Server running on port " + PORT);
  });
// });
