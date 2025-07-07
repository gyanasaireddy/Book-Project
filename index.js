import express from "express";
import pg from "pg";
import axios from "axios";
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const port = 3000;

const db = new pg.Client({
  user: "postgres",
  password: "generatorx",
  host: "localhost",
  port: 5432,
  database: "book_notes",
});

db.connect();

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";
// const API_KEY = process.env.GOOGLE_BOOKS_KEY;
const API_KEY = "";

app.get("/", async (req, res) => {
  let titleList = ["atomic habits", "deep work"];
  // if (!q) return res.status(400).json({ error: "Missing query parameter q" });

  try {
    const requests = titleList.map((title) =>
      axios.get(GOOGLE_BOOKS_API, {
        params: {
          q: title,
          key: API_KEY,
          maxResults: 1,
          fields: "items(volumeInfo(title,authors,description,imageLinks))",
        },
      })
    );

    const results = await Promise.all(requests);
    const books = results
      .map((r) => r.data.items?.[0] || null)
      .filter((b) => b !== null);

    res.render('index.ejs',{books})
    console.log(books);
    
  } catch (err) {
    console.error("Google Books API error:", err.message);
    res.status(500).json({ error: "Failed to fetch from Google Books" });
  }
});

app.get("/readmore", (req, res) => {
  res.render("readmore.ejs");
});

app.listen(port, () => {
  console.log("Server started on port: " + port);
});
