require("dotenv").config();
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
let claimed = [];

if (fs.existsSync(CLAIMED_FILE)) {
  claimed = JSON.parse(fs.readFileSync(CLAIMED_FILE, "utf8"));
}

client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// Slash commands handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const guild = interaction.guild;

  // SIMULATE BOOST
  if (interaction.commandName === "simulateboost") {
    if (claimed.some(entry => entry === userId || (entry.userId === userId))) {
      return interaction.reply({ content: "❌ You've already claimed your boost reward.", ephemeral: true });
    }

    const boostChannel = await guild.channels.fetch(process.env.BOOST_CHANNEL_ID);
    if (!boostChannel) {
      return interaction.reply({ content: "❌ Boost channel not found.", ephemeral: true });
    }

    const thread = await boostChannel.threads.create({
      name: `Boost Thread - ${interaction.user.username}`,
      autoArchiveDuration: 60,
      type: ChannelType.PrivateThread,
      invitable: false,
      reason: `Simulated boost thread for ${interaction.user.tag}`,
    });

    await thread.members.add(userId);

    // Ensure they can send messages inside the thread
    await thread.permissionOverwrites.edit(userId, {
      SendMessages: true,
      ViewChannel: true,
    });

    await thread.send(
      `Hey <@${userId}>! Thanks for boosting the server! 🎉\n` +
      `Reply in this thread with your **desired role name**, **color** (hex code), and **emoji**.\n` +
      `Example: \`Boost Daddy #ff33aa <:nerdkawa:1399082077298884702>\``
    );

    claimed.push(userId);
    fs.writeFileSync(CLAIMED_FILE, JSON.stringify(claimed, null, 2));

    await interaction.reply({ content: "✅ Simulated boost thread created!", ephemeral: true });
  }

  // DELETE BOOST ROLE
  if (interaction.commandName === "deletemyboostrole") {
    const member = await guild.members.fetch(userId);

    const role = guild.roles.cache.find(r =>
      member.roles.cache.has(r.id) &&
      r.name.toLowerCase().includes(interaction.user.username.toLowerCase())
    );

    if (!role) {
      return interaction.reply({ content: "❌ You don't have a custom boost role assigned.", ephemeral: true });
    }

    try {
      await member.roles.remove(role);
      await role.delete(`User ${interaction.user.tag} deleted their boost role.`);

      claimed = claimed.filter(entry => {
        if (typeof entry === "string") return entry !== userId;
        if (typeof entry === "object") return entry.userId !== userId;
      });

      fs.writeFileSync(CLAIMED_FILE, JSON.stringify(claimed, null, 2));

      await interaction.reply({
        content: "✅ Your boost role has been deleted. You can now create a new one by boosting or using /simulateboost.",
        ephemeral: true,
      });
    } catch (err) {
      console.error("❌ Error deleting boost role:", err);
      await interaction.reply({
        content: "❌ Something went wrong while deleting your role.",
        ephemeral: true,
      });
    }
  }

  // CLAIM BOOST ROLE
  if (interaction.commandName === "claimboostrole") {
    if (claimed.some(entry => entry.userId === userId || entry === userId)) {
      return interaction.reply({
        content: "❌ You've already claimed your boost role.",
        ephemeral: true,
      });
    }

    const member = await guild.members.fetch(userId);
    if (!member.premiumSince) {
      return interaction.reply({
        content: "❌ You are not currently boosting the server.",
        ephemeral: true,
      });
    }

    const boostChannel = await guild.channels.fetch(process.env.BOOST_CHANNEL_ID);
    if (!boostChannel) {
      return interaction.reply({ content: "❌ Boost channel not found.", ephemeral: true });
    }

    const thread = await boostChannel.threads.create({
      name: `Boost Thread - ${interaction.user.username}`,
      autoArchiveDuration: 60,
      type: ChannelType.PrivateThread,
      invitable: false,
      reason: `Manual claim boost thread for ${interaction.user.tag}`,
    });

    await thread.members.add(userId);

    // Permissions so they can talk
    await thread.permissionOverwrites.edit(userId, {
      SendMessages: true,
      ViewChannel: true,
    });

    await thread.send(
      `Hey <@${userId}>! Thanks for boosting the server! 🎉\n` +
      `Reply in this thread with your **desired role name**, **color** (hex code), and **emoji**.\n` +
      `Example: \`Boost Daddy #ff33aa <:nerdkawa:1399082077298884702>\``
    );

    if (Array.isArray(claimed[0])) {
      claimed.push([userId]); // legacy support
    } else {
      claimed.push({ userId });
    }
    fs.writeFileSync(CLAIMED_FILE, JSON.stringify(claimed, null, 2));

    await interaction.reply({
      content: "✅ Your boost thread has been created! Check it to submit your role.",
      ephemeral: true,
    });
  }
});

// Detect real boosts
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
        reason: `Boost thread for ${newMember.user.tag}`,
      });

      await thread.members.add(userId);

      // Permissions so they can talk
      await thread.permissionOverwrites.edit(userId, {
        SendMessages: true,
        ViewChannel: true,
      });

      await new Promise((r) => setTimeout(r, 1000));

      await thread.send(
        `Hey <@${userId}>! Thanks for boosting the server! 🎉\n` +
        `Reply in this thread with your **desired role name**, **color** (hex code), and **emoji**.\n` +
        `Example: \`Boost Daddy #ff33aa 🔥\``
      );

      claimed.push(userId);
      fs.writeFileSync(CLAIMED_FILE, JSON.stringify(claimed, null, 2));
    }
  } catch (err) {
    console.error("Boost detection error:", err);
  }
});

function isValidHex(color) {
  return /^#([0-9A-F]{3}){1,2}$/i.test(color);
}

// Handle thread messages for role creation
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
      return thread.send(`<@${userId}> Please send role name, hex color, and emoji like this:\n\`Cool Cat #ff8800 <:nerdkawa:1399082077298884702>\``);
    }

    const emojiInput = parts.pop();
    const colorInput = parts.pop();
    const roleName = parts.join(" ");

    const roleColor = isValidHex(colorInput) ? colorInput : "Default";

    const roleOptions = {
      name: roleName,
      color: roleColor,
      hoist: false,
      position: guild.members.me.roles.highest.position - 1,
      reason: `Custom boost role for ${message.author.tag}`,
    };

    // Handle emoji
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
    if (!role) {
      role = await guild.roles.create(roleOptions);
    }

    const member = await guild.members.fetch(userId);
    await member.roles.add(role);

    await thread.send(`✅ <@${userId}> Role **${roleName}** created and assigned! ${emojiDisplay}`);
    await thread.setArchived(true);

    claimed = claimed.filter(id => id !== userId && id.userId !== userId);
    fs.writeFileSync(CLAIMED_FILE, JSON.stringify(claimed, null, 2));
  } catch (err) {
    console.error("Error handling thread reply:", err);
  }
});

client.login(process.env.TOKEN);
