import express from "express";
import pg from "pg";
import axios from "axios";
const app = express();
import dotenv from "dotenv"
dotenv.config();

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  password: "",
  host: "localhost",
  port: 5432,
  database: "book_project",
});

db.connect();

let dbBook = [];
let titleList = ["atomic habits", "deep work"];

async function getDatabase() {
  titleList = [];
  const result = await db.query("SELECT * FROM books ORDER BY readdate");
  // console.log(result.rows[0]);
  dbBook = result.rows;
  result.rows.forEach((b) => {
    titleList.push(b.title);
  });
}

let books = [];

async function getAPIBooks() {
  const requests = titleList.map((title) =>
    axios.get(GOOGLE_BOOKS_API, {
      params: {
        q: title,
        key: API_KEY,
        maxResults: 1,
        fields:
          "items(volumeInfo(title,authors,description,imageLinks,industryIdentifiers))",
      },
    })
  );

  const results = await Promise.all(requests);
  return results
    .map((r) => r.data.items?.[0] || null)
    .filter((b) => b !== null);
}
const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";
// const API_KEY = process.env.GOOGLE_BOOKS_KEY;
const API_KEY = "";

app.get("/", async (req, res) => {
  // if (!q) return res.status(400).json({ error: "Missing query parameter q" });
  await getDatabase();
  try {
    books = await getAPIBooks();
    res.render("index.ejs", { books: books, database: dbBook });
    // console.log(books);
  } catch (err) {
    console.error("Google Books API error:", err.message);
    // res.status(500).json({ error: "Failed to fetch from Google Books" });
        res.render('error.ejs',{ errorMessage: `Google Books API is down` })

  }
});

app.get("/readmore/:id", async (req, res) => {
  // console.log(req.query.title);
  // console.log(books);
  try {
     await getDatabase();
  books = await getAPIBooks();
  const isbn = req.params.id;

  const i = books.findIndex(
    (book) => book.volumeInfo.industryIdentifiers[0].identifier == isbn
  );
  // console.log(books[i]+ '----------------'+dbBook[i].rating);
  res.render("readmore.ejs", { selectedBook: books[i], database: dbBook[i] });
  } catch (error) {
        res.render('error.ejs',{ errorMessage: `Something went wrong fetching the book` })
  }
 
});

app.get("/addReview", (req, res) => {
  res.render("addPage.ejs");
});

app.post("/submit-review", async (req, res) => {
  const { title, rating, review } = req.body;

  try {
    const getId = await axios.get(GOOGLE_BOOKS_API, {
      params: {
        q: title,
        key: API_KEY,
        maxResults: 1,
        fields: "items(volumeInfo(industryIdentifiers))",
      },
    });

    // console.log( '-------------------  ' + getId.data.items);
    const date = new Date();
    const data = await db.query(
      "INSERT INTO books(title,rating,review,readdate,isbn) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [
        title,
        rating,
        review,
        date,
        getId.data.items[0].volumeInfo.industryIdentifiers[0].identifier,
      ]
    );
    res.redirect("/");
  } catch (error) {
    res.render("error.ejs", {
      errorMessage: `Guess you got the book Name wrong or That book doesn’t exist or was deleted.`,
    });
  }

  // console.log(data.rows);
});

app.post("/update-review", async (req, res) => {
  const { review } = req.body;
  try {
    await db.query(
      "UPDATE books SET review = $1,readdate = NOW() WHERE isbn = $2",
      [review, req.body.updatedReview]
    );

    res.redirect(`/readmore/${req.body.updatedReview}`);
  } catch (err) {
    console.error("Error updating review:", err);
    res.render("error.ejs", { errorMessage: `Error updating review` });
  }
});

app.post("/delete-review", async (req, res) => {
  const reviewId = req.body.reviewId;
  try {
    await db.query("DELETE FROM books WHERE isbn = $1", [reviewId]);
    res.redirect("/");
  } catch (err) {
    console.error("Error deleting review:", err);
    res.render("error.ejs", {
      errorMessage: `Something went wrong while deleting`,
    });
  }
});

app.listen(port, () => {
  console.log("Server started on port: " + port);
});
