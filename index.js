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
  database: "book_project",
});

db.connect();

let dbBook = [];
let titleList = ["atomic habits", "deep work"];

async function getDatabase() {
  titleList = []
  const result = await db.query('SELECT * FROM books')
  console.log(result.rows[0]);
  dbBook =  result.rows;
  result.rows.forEach((b)=>{
    titleList.push(b.title)
  })
  
}

let books =[];

async function getAPIBooks() {
      const requests = titleList.map((title) =>
      axios.get(GOOGLE_BOOKS_API, {
        params: {
          q: title,
          key: API_KEY,
          maxResults: 1,
          fields: "items(volumeInfo(title,authors,description,imageLinks,industryIdentifiers))",
        },
      })
    );

    const results = await Promise.all(requests);
    return  results
      .map((r) => r.data.items?.[0] || null)
      .filter((b) => b !== null);
  
}
const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";
// const API_KEY = process.env.GOOGLE_BOOKS_KEY;
const API_KEY = "AIzaSyCZAcv-6nJkrWsT05DfSQAJ-Ch9oVcEt70";

app.get("/", async (req, res) => {
  // if (!q) return res.status(400).json({ error: "Missing query parameter q" });
  await getDatabase()
  try {
    books = await getAPIBooks();
    res.render('index.ejs',{books:books, database:dbBook})
    // console.log(books);
    
  } catch (err) {
    console.error("Google Books API error:", err.message);
    res.status(500).json({ error: "Failed to fetch from Google Books" });
  }
});

app.get("/readmore/:id", (req, res) => {
  // console.log(req.query.title);
  // console.log(books);
  
  const isbn = req.params.id
  
  const i = books.findIndex((book)=>
    book.volumeInfo.industryIdentifiers[0].identifier == isbn
 )
  
  // console.log(books[i]+ '----------------'+dbBook[i].rating);
  


  res.render("readmore.ejs",{selectedBook:books[i], database:dbBook[i] });
});

app.listen(port, () => {
  console.log("Server started on port: " + port);
});
