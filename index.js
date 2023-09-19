require("dotenv").config();

const express = require("express"); // Express web server framework
const request = require("request"); // "Request" library
const session = require("express-session");
const cors = require("cors");
const querystring = require("querystring");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

const client_id = process.env.client_id; // Your client id
const client_secret = process.env.client_secret; // Your secret
const redirect_uri =
  process.env.NODE_ENV === "production"
    ? process.env.redirect_uri
    : "http://localhost:4000/callback"; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = function (length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = "spotify_auth_state";

var app = express();

if (process.env.NODE_ENV === "development") {
  app.use(express.static(__dirname + "/public"));
  app.set("views", __dirname + "/views");
}

app
  .set("view engine", "ejs")
  .use(cors())
  .use(cookieParser())
  .use(bodyParser.urlencoded({ extended: false }))
  .use(bodyParser.json())

  .use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie: { maxAge: 1000 * 60 * 60 * 24 },
    })
  );

app.get("/login", function (req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = "user-read-private user-read-email";
  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

app.get("/callback", function (req, res) {
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      },
      headers: {
        Authorization:
          "Basic " +
          new Buffer(client_id + ":" + client_secret).toString("base64"),
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        const access_token = body.access_token,
          refresh_token = body.refresh_token;

        var options = {
          url: "https://api.spotify.com/v1/me",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        // use the access token to access the Spotify Web API
        request.get(options, function (error, response, body) {
          if (!error && response.statusCode === 200) {
            req.session.access_token = access_token;
            req.session.display_name = body.display_name;
            res.redirect("/");
          } else {
            res.redirect(
              "/#" +
                querystring.stringify({
                  error: "failedToUseToken",
                })
            );
          }
        });

        // we can also pass the token to the browser to make requests from there
      } else {
        res.redirect(
          "/#" +
            querystring.stringify({
              error: "invalid_token",
            })
        );
      }
    });
  }
});

app.get("/refresh_token", function (req, res) {
  // requesting access token from refresh token
  const refresh_token = req.session.refresh_token;
  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " +
        new Buffer(client_id + ":" + client_secret).toString("base64"),
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        access_token: access_token,
      });
    }
  });
});

app.get("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy();
  }
  res.redirect("/");
});

app.get("/", (req, res) => {
  const username = req.session.display_name;
  console.log(req.session.access_token);
  res.render("index.ejs", { username });
});

app.get("/playlistInfo", (req, res) => {
  // if (!req.session.access_token) res.redirect("/login");
  console.log(req.query);
  const rawURL = req.query.linkURL;
  console.log("rawURL", rawURL);
  if (rawURL) {
    const match = rawURL.match(/[A-Za-z0-9]{22}/);
    if (match !== null) {
      const playlistURI = match[0];
      if (rawURL.includes("album")) {
        fetch(`https://api.spotify.com/v1/albums/${playlistURI}`, {
          headers: { Authorization: "Bearer " + req.session.access_token },
        })
          .then((resp) => resp.json())
          .then((data) => {
            if (data.error && data.error.status === 401) {
              return res.redirect("/logout");
            }
            return res.json({ rawURL, data, error: null });
          })
          .catch((err) => {
            console.log(err);
            return res.json({ error: "Invalid URL" });
          });
      } else if (rawURL.includes("playlist")) {
        fetch(`https://api.spotify.com/v1/playlists/${playlistURI}`, {
          headers: { Authorization: "Bearer " + req.session.access_token },
        })
          .then((resp) => resp.json())
          .then((data) => {
            if (data.error && data.error.status === 401) {
              return res.redirect("/logout");
            }
            return res.json({ rawURL, data, error: null });
          })
          .catch((err) => {
            console.log(err);
            return res.json({ error: "Invalid URL" });
          });
      } else {
        console.log("album or playlist not in url");
        return res.json({ error: "Invalid URL" });
      }
    } else {
      console.log("Not a url");
      return res.json({ error: "Not a url" });
    }
  }
});

console.log("Listening on 4000");
app.listen(4000);
// Export the Express API
module.exports = app;
