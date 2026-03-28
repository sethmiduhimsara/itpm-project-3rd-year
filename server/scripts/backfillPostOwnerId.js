require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("node:dns");

const Post = require("../models/Post");
const User = require("../models/User");

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function hasOwnerId(post) {
  const ownerId = String(post.ownerId || "").trim();
  return ownerId.length > 0;
}

async function run() {
  dns.setServers(["1.1.1.1", "8.8.8.8"]);

  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const dryRun = !apply || args.has("--dry-run");

  if (!process.env.MONGO_URI) {
    console.error("Missing MONGO_URI in environment.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    const [users, posts] = await Promise.all([
      User.find({}, { _id: 1, name: 1 }).lean(),
      Post.find({}, { _id: 1, author: 1, ownerId: 1 }).lean(),
    ]);

    const nameToUsers = new Map();
    for (const user of users) {
      const key = normalizeName(user.name);
      if (!key) continue;
      const list = nameToUsers.get(key) || [];
      list.push(user);
      nameToUsers.set(key, list);
    }

    const missingOwner = posts.filter((post) => !hasOwnerId(post));
    const updates = [];
    const skippedNoMatch = [];
    const skippedAmbiguous = [];

    for (const post of missingOwner) {
      const key = normalizeName(post.author);
      const matchedUsers = nameToUsers.get(key) || [];

      if (matchedUsers.length === 1) {
        updates.push({
          postId: String(post._id),
          ownerId: String(matchedUsers[0]._id),
          author: post.author,
          matchedName: matchedUsers[0].name,
        });
      } else if (matchedUsers.length === 0) {
        skippedNoMatch.push({ postId: String(post._id), author: post.author });
      } else {
        skippedAmbiguous.push({
          postId: String(post._id),
          author: post.author,
          candidates: matchedUsers.map((u) => ({
            id: String(u._id),
            name: u.name,
          })),
        });
      }
    }

    console.log("--- Post ownerId backfill summary ---");
    console.log(`Total posts: ${posts.length}`);
    console.log(
      `Posts already with ownerId: ${posts.length - missingOwner.length}`,
    );
    console.log(`Posts missing ownerId: ${missingOwner.length}`);
    console.log(`Will backfill: ${updates.length}`);
    console.log(`Skipped (no matching user name): ${skippedNoMatch.length}`);
    console.log(`Skipped (ambiguous user name): ${skippedAmbiguous.length}`);

    if (skippedAmbiguous.length > 0) {
      console.log("Ambiguous examples (first 5):");
      skippedAmbiguous.slice(0, 5).forEach((item, idx) => {
        console.log(
          `${idx + 1}. postId=${item.postId}, author="${item.author}", candidates=${item.candidates.length}`,
        );
      });
    }

    if (dryRun) {
      console.log("Mode: DRY RUN (no database updates applied).");
      return;
    }

    if (updates.length === 0) {
      console.log("Mode: APPLY. Nothing to update.");
      return;
    }

    const bulkOps = updates.map((item) => ({
      updateOne: {
        filter: {
          _id: item.postId,
          $or: [
            { ownerId: { $exists: false } },
            { ownerId: "" },
            { ownerId: null },
          ],
        },
        update: { $set: { ownerId: item.ownerId } },
      },
    }));

    const result = await Post.bulkWrite(bulkOps, { ordered: false });
    console.log("Mode: APPLY");
    console.log(`Matched: ${result.matchedCount || 0}`);
    console.log(`Modified: ${result.modifiedCount || 0}`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(async (err) => {
  console.error("Backfill failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors on failure path
  }
  process.exit(1);
});
