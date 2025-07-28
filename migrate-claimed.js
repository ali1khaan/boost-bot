const fs = require("fs");
const path = "./claimedBoosts.json";

if (!fs.existsSync(path)) {
  console.log("claimedBoosts.json not found. Nothing to migrate.");
  process.exit();
}

// Load old data
const oldData = JSON.parse(fs.readFileSync(path, "utf8"));

// Map old user IDs to new objects
// You *MUST* replace this mapping with the actual role IDs you want to assign for each user.
const userRoleMap = {
  "123456789012345678": "ROLE_ID_FOR_USER_1",
  "987654321098765432": "ROLE_ID_FOR_USER_2",
  // add more mappings here...
};

const newData = oldData.map(userId => {
  if (!userRoleMap[userId]) {
    console.warn(`No role ID found for user ${userId}. Skipping.`);
    return null;
  }
  return { userId, roleId: userRoleMap[userId] };
}).filter(Boolean);

fs.writeFileSync(path, JSON.stringify(newData, null, 2));

console.log("Migration complete! Updated claimedBoosts.json:");
console.log(newData);
