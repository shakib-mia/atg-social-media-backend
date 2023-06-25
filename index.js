const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const uri = `mongodb+srv://smdshakibmia2001:${process.env.db_pass}@cluster0.e6t4faf.mongodb.net/?retryWrites=true&w=majority`;
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send(`from port: ${port}`));

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const usersCollection = await client
      .db("atg-social-media")
      .collection("users");

    app.post("/login", async (req, res) => {
      const { username, password } = req.body;
      const cursor = await usersCollection.find({
        username: username,
        password: password,
      });
      const users = await cursor.toArray();

      const user = {
        email: users[0].email,
        username: users[0].username,
        _id: users[0].id,
      };

      if (users[0]) {
        const token = jwt.sign(user, process.env.access_token_secret, {
          expiresIn: "1h",
        });

        res.send({ token });
      } else {
        res.send({ message: "Wrong Credentials" });
      }
    });

    app.post("/register", async (req, res) => {
      const { email, username, password } = req.body;

      if (!email.length) {
        res.send({ message: "Email is empty" });
      }

      if (!username.length) {
        res.send({ message: "Username is empty" });
      }

      if (!password.length) {
        res.send({ message: "Password is empty" });
      }

      if (email.length && username.length && password.length) {
        const usernameCursor = await usersCollection.find({ username });
        const usernameData = await usernameCursor.toArray();
        const emailCursor = await usersCollection.find({ email });
        const emailData = await emailCursor.toArray();

        if (usernameData[0] && !emailData[0]) {
          res.send({ type: "error", message: "username already exists" });
        }

        if (usernameData[0] && emailData[0]) {
          //   console.log(usernameData);
          res.send({
            type: "error",
            message: "email & username already in use",
          });
        }

        if (emailData[0] && !usernameData[0]) {
          //   console.log(emailData);
          res.send({ type: "error", message: "Email Already in use" });
        }

        if (!usernameData[0] && !emailData[0]) {
          //   res.send({ message: "both are available" });

          const usersCursor = await usersCollection.insertOne({
            email,
            username,
            password,
          });

          if (usersCursor.acknowledged) {
            const token = jwt.sign(
              { email, username },
              process.env.access_token_secret,
              {
                expiresIn: "1h",
              }
            );

            res.send({ token });
          }
        }
      }
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => console.log(`listening on port ${port}`));
