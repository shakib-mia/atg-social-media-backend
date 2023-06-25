const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");

var transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "smdshakibmia2001@gmail.com",
    pass: "cetwaezxasyfgsoo",
  },
});

require("dotenv").config();

const uri = `mongodb+srv://smdshakibmia2001:${process.env.db_pass}@cluster0.e6t4faf.mongodb.net/?retryWrites=true&w=majority`;
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

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

    const postsCollection = await client
      .db("atg-social-media")
      .collection("posts");

    app.post("/login", async (req, res) => {
      const { username, password } = req.body;
      const cursor = await usersCollection.find({
        username: username,
        password: password,
      });
      const users = await cursor.toArray();

      if (users[0]) {
        const user = {
          email: users[0].email,
          username: users[0].username,
          _id: users[0].id,
        };
        console.log(user);
        const token = jwt.sign(user, process.env.access_token_secret, {
          expiresIn: "1d",
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
                expiresIn: "1d",
              }
            );

            res.send({ token });
          }
        }
      }
    });

    app.get("/user", (req, res) => {
      const { token } = req.headers;

      res.send(jwt.decode(token));
    });

    app.post("/reset-password", async (req, res) => {
      const { email } = req.body;

      const cursor = await usersCollection.find({ email });
      const user = await cursor.toArray();

      const link = `http://localhost:3000/reset-password/${email}`;

      if (user[0]) {
        var mailOptions = {
          from: "smdshakibmia2001@gmail.com",
          to: email,
          subject: "Reset Password for ATG Social Media",
          text: link,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            // console.log("Email sent: " + info.response);
            // res.status(200);
            res.send({ message: info });
          }
        });
      }
      if (!user[0]) {
        res.send({ type: "failed", message: "User not found" });
      }
    });

    app.post("/confirm-reset-password", async (req, res) => {
      const { email, password } = req.body;
      const cursor = await usersCollection.updateOne(
        { email },
        {
          $set: {
            password,
          },
        },
        {
          upsert: true,
        }
      );
      // const user = await
      res.send(cursor);
    });

    app.get("/posts", async (req, res) => {
      const query = {};

      const cursor = await postsCollection.find(query);
      const posts = await cursor.toArray();

      res.send({ posts });
    });

    app.post("/posts", async (req, res) => {
      const data = req.body;

      console.log(data);
    });

    app.put("/like", async (req, res) => {
      const { _id, token, likedBy } = req.body;
      const user = jwt.verify(token, process.env.access_token_secret);
      // console.log(_id);
      const newLikes = [...likedBy, user.username];
      const updatedDoc = {
        $set: {
          likedBy: newLikes,
        },
      };
      // console.log({ _id });
      const query = { _id: new ObjectId(_id) };

      const cursor = await postsCollection.updateOne(query, updatedDoc);
      res.send(cursor);
    });

    app.put("/comments", async (req, res) => {
      const { _id, token, comment } = req.body;
      // const comments = {commentedBy, comment}
      const user = jwt.verify(token, process.env.access_token_secret);

      console.log(user);
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => console.log(`listening on port ${port}`));
