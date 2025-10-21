const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// --- (THIS IS THE FIX) ---
// Switched from onRequest to onCall
exports.initiateGitHubAuth = functions.https.onCall((data, context) => {
  // Check if the user is authenticated (onCall does this automatically)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to connect with GitHub."
    );
  }

  // Data is passed directly, not in req.body
  const { roomId, userId } = data;
  if (!roomId || !userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing roomId or userId."
    );
  }

  const state = `${roomId}_${userId}`;
  const githubClientId = functions.config().github.client_id;
  
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&scope=repo&state=${state}`;

  // Simply return the object. Firebase will format it correctly.
  return { authUrl: authUrl };
});

// --- Function 2: Handle the Callback from GitHub ---
exports.handleGitHubCallback = functions.https.onRequest(async (req, res) => {
  const code = req.query.code;
  const state = req.query.state;

  if (!code || !state) {
    return res.status(400).send("Missing code or state from GitHub callback.");
  }
  
  // Extract our IDs from the state parameter
  const [roomId, userId] = state.split('_');

  try {
    const githubClientId = functions.config().github.client_id;
    const githubClientSecret = functions.config().github.client_secret;

    // Exchange the temporary code for a permanent access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: githubClientId,
        client_secret: githubClientSecret,
        code: code,
      },
      { headers: { "Accept": "application/json" } }
    );

    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
        throw new Error("Access Token not found in GitHub response.");
    }

    // Securely save the access token to a private subcollection for the user
    await admin.firestore()
      .collection("users")
      .doc(userId)
      .collection("private")
      .doc("github")
      .set({ accessToken: accessToken });

    // Redirect the user back to the deployment page in your app
    const appUrl = `https://codetrain-40b2c.web.app/room/${roomId}/deployment`; // Your app's URL
    res.redirect(appUrl);

  } catch (error) {
    console.error("Error handling GitHub callback:", error);
    res.status(500).send("Authentication failed. Please try again.");
  }
});


// --- Function 3: Trigger a Deployment on Vercel ---
exports.deployToVercel = functions.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "You must be logged in to deploy.");
  }

  const { repoURL, projectName } = data;
  if (!repoURL || !projectName) {
     throw new functions.https.HttpsError("invalid-argument", "Missing repoURL or projectName.");
  }
  
  // This is a simplified repo name, e.g., "your-name/your-repo"
  const gitRepoName = repoURL.replace("https://github.com/", "");
  const vercelToken = functions.config().vercel.token;

  try {
    // Make the API call to Vercel to start a new deployment
    const vercelResponse = await axios.post(
      "https://api.vercel.com/v13/deployments",
      {
        name: projectName, // Vercel uses this as the project name
        gitSource: {
          type: "github",
          repo: gitRepoName,
          ref: "main", // You can change this to deploy other branches
        },
      },
      {
        headers: {
          "Authorization": `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Return the initial deployment data from Vercel
    return { success: true, deployment: vercelResponse.data };

  } catch (error) {
    console.error("Error deploying to Vercel:", error.response ? error.response.data : error.message);
    throw new functions.https.HttpsError("internal", "Failed to trigger deployment on Vercel.");
  }
});