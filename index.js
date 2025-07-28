require("dotenv").config(); // MUST BE FIRST to load env vars

console.log("Token loaded:", process.env.TOKEN ? "[OK]" : "[MISSING]");

const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  ChannelType,
  Events,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const CLAIMED_FILE = "./claimedBoosts.json";
let claimed = fs.existsSync(CLAIMED_FILE)
  ? JSON.parse(fs.readFileSync(CLAIMED_FILE, "utf8"))
  : [];

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// 🔧 Utility
function isValidHex(color) {
  return /^#([0-9A-F]{3}){1,2}$/i.test(color);
}

function autoDeleteThread(thread) {
  setTimeout(async () => {
    try {
      const fetched = await thread.fetch();
      if (!fetched.archived) await thread.setArchived(true, "Auto-archive after 24h");
      await thread.delete("Auto-delete after 24h");
    } catch (err) {
      console.error("Thread auto-delete failed:", err);
    }
  }, 1000 * 60 * 60 * 24); // 24 hours
}

// 🔁 Slash Commands
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const guild = interaction.guild;

  const alreadyClaimed = claimed.some(entry =>
    entry === userId || (entry.userId && entry.userId === userId)
  );

  // 🧪 Simulated boost
  if (interaction.commandName === "simulateboost") {
    if (alreadyClaimed) {
      return interaction.reply({ content: "❌ You've already claimed your boost reward.", flags: 64 });
    }

    const boostChannel = await guild.channels.fetch(process.env.BOOST_CHANNEL_ID);
    if (!boostChannel) return interaction.reply({ content: "❌ Boost channel not found.", flags: 64 });

    const thread = await boostChannel.threads.create({
      name: `Boost Thread - ${interaction.user.username}`,
      autoArchiveDuration: 60,
      type: ChannelType.PrivateThread,
      invitable: false,
      reason: `Simulated boost thread for ${interaction.user.tag}`,
    });

    await thread.members.add(userId);
    await thread.permissionOverwrites.edit(userId, {
      SendMessages: true,
      ViewChannel: true,
    });

    await thread.send(`Hey <@${userId}>! Thanks for boosting the server! 🎉\nReply with your **role name**, **hex color**, and **emoji**.\nExample: \`Boost Daddy #ff33aa 🔥\``);

    autoDeleteThread(thread);
    claimed.push(userId);
    fs.writeFileSync(CLAIMED_FILE, JSON.stringify(claimed, null, 2));

    await interaction.reply({ content: "✅ Simulated boost thread created!", flags: 64 });
  }

  // 🗑 Delete custom boost role
  if (interaction.commandName === "deletemyboostrole") {
    const member = await guild.members.fetch(userId);

    // Find claimed entry with roleId
    const claimEntry = claimed.find(entry => entry.userId === userId);
    if (!claimEntry) {
      return interaction.reply({ content: "❌ No custom boost role found for you.", flags: 64 });
    }

    // Get the role by ID
    const role = guild.roles.cache.get(claimEntry.roleId);

    if (!role || !member.roles.cache.has(role.id)) {
      return interaction.reply({ content: "❌ Your custom boost role was not found or you don't have it.", flags: 64 });
    }

    try {
      await member.roles.remove(role);
      await role.delete(`Boost role deleted by ${interaction.user.tag}`);

      // Remove claim entry
      claimed = claimed.filter(entry => entry.userId !== userId);
      fs.writeFileSync(CLAIMED_FILE, JSON.stringify(claimed, null, 2));

      await interaction.reply({
        content: "✅ Boost role deleted. You may now create a new one via /simulateboost.",
        flags: 64,
      });
    } catch (err) {
      console.error("❌ Error deleting boost role:", err);
      await interaction.reply({
        content: "❌ Something went wrong while deleting your role.",
        flags: 64,
      });
    }
  }

  // 🎁 Claim boost role
  if (interaction.commandName === "claimboostrole") {
    if (alreadyClaimed) {
      return interaction.reply({ content: "❌ You've already claimed your boost role.", flags: 64 });
    }

    const member = await guild.members.fetch(userId);
    if (!member.premiumSince) {
      return interaction.reply({ content: "❌ You're not boosting this server.", flags: 64 });
    }

    const boostChannel = await guild.channels.fetch(process.env.BOOST_CHANNEL_ID);
    if (!boostChannel) return interaction.reply({ content: "❌ Boost channel not found.", flags: 64 });

    const thread = await boostChannel.threads.create({
      name: `Boost Thread - ${interaction.user.username}`,
      autoArchiveDuration: 60,
      type: ChannelType.PrivateThread,
      invitable: false,
      reason: `Boost thread for ${interaction.user.tag}`,
    });

    await thread.members.add(userId);
    await thread.permissionOverwrites.edit(userId, {
      SendMessages: true,
      ViewChannel: true,
    });

    await thread.send(`Hey <@${userId}>! Thanks for boosting the server! 🎉\nReply with your **role name**, **hex color**, and **emoji**.\nExample: \`Boost Daddy #ff33aa 🔥\``);

    autoDeleteThread(thread);
    claimed.push({ userId });
    fs.writeFileSync(CLAIMED_FILE, JSON.stringify(claimed, null, 2));

    await interaction.reply({ content: "✅ Boost thread created! Check it to claim your role.", flags: 64 });
  }
});

// 🎯 Real boost detection
client.on("guildMemberUpdate", async (oldMember, newMember) => {
  try {
    if (!oldMember.premiumSince && newMember.premiumSince) {
      const userId = newMember.id;
      if (claimed.includes(userId) || claimed.some(e => e.userId === userId)) return;

      const boostChannel = await newMember.guild.channels.fetch(process.env.BOOST_CHANNEL_ID);
      if (!boostChannel) return;

      const thread = await boostChannel.threads.create({
        name: `Boost Thread - ${newMember.user.username}`,
        autoArchiveDuration: 60,
        type: ChannelType.PrivateThread,
        invitable: false,
        reason: `Real boost thread for ${newMember.user.tag}`,
      });

      await thread.members.add(userId);
      await thread.permissionOverwrites.edit(userId, {
        SendMessages: true,
        ViewChannel: true,
      });

      await thread.send(`Hey <@${userId}>! Thanks for boosting the server! 🎉\nReply with your **role name**, **hex color**, and **emoji**.\nExample: \`Boost Daddy #ff33aa 🔥\``);

      autoDeleteThread(thread);
      claimed.push(userId);
      fs.writeFileSync(CLAIMED_FILE, JSON.stringify(claimed, null, 2));
    }
  } catch (err) {
    console.error("Boost detection error:", err);
  }
});

// 🧠 Thread reply logic without confirmation, immediate role creation & assignment
client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (!message.channel.isThread() || message.channel.type !== ChannelType.PrivateThread) return;
    if (!message.channel.name.startsWith("Boost Thread - ")) return;

    const thread = message.channel;
    const userId = message.author.id;
    const guild = message.guild;

    const parts = message.content.trim().split(" ");
    if (parts.length < 3) {
      return thread.send(`<@${userId}> Send role name, color, and emoji like:\n\`Cool Cat #ff8800 🔥\``);
    }

    const emojiInput = parts.pop();
    const colorInput = parts.pop();
    const roleName = parts.join(" ");
    const roleColor = isValidHex(colorInput) ? colorInput : "Default";

    const roleOptions = {
      name: roleName,
      color: roleColor === "Default" ? undefined : roleColor,
      hoist: false,
      position: guild.members.me.roles.highest.position - 1,
      reason: `Boost role for ${message.author.tag}`,
    };

    let emojiDisplay = emojiInput;
    const guildEmoji = guild.emojis.cache.find(e => e.name === emojiInput);
    if (guildEmoji) {
      const format = guildEmoji.animated ? "gif" : "png";
      roleOptions.icon = `https://cdn.discordapp.com/emojis/${guildEmoji.id}.${format}`;
      emojiDisplay = `<${guildEmoji.animated ? "a" : ""}:${guildEmoji.name}:${guildEmoji.id}>`;
    } else {
      const emojiMatch = emojiInput.match(/<a?:\w+:(\d+)>/);
      if (emojiMatch) {
        const emojiId = emojiMatch[1];
        const isAnimated = emojiInput.startsWith("<a:");
        const format = isAnimated ? "gif" : "png";
        const foundEmoji = guild.emojis.cache.get(emojiId);
        if (foundEmoji) {
          roleOptions.icon = `https://cdn.discordapp.com/emojis/${emojiId}.${format}`;
        }
      }
    }

    let role = guild.roles.cache.find(r => r.name === roleName);
    if (!role) role = await guild.roles.create(roleOptions);

    const member = await guild.members.fetch(userId);
    await member.roles.add(role);

    await thread.send(`✅ Role **${roleName}** created and assigned! ${emojiDisplay}`);
    await thread.setArchived(true);

    // Update claimed with roleId for accurate deletion later
    claimed = claimed.filter(entry => entry.userId !== userId);
    claimed.push({ userId, roleId: role.id });
    fs.writeFileSync(CLAIMED_FILE, JSON.stringify(claimed, null, 2));
  } catch (err) {
    console.error("Thread role creation error:", err);
  }
});

client.login(process.env.TOKEN);
