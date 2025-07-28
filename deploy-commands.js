require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  // 🧪 Simulate Boost
  new SlashCommandBuilder()
    .setName("simulateboost")
    .setDescription("Simulate a server boost (ADMIN ONLY)"),

  // 🗑 Delete Boost Role by Name
  new SlashCommandBuilder()
    .setName("deletemyboostrole")
    .setDescription("Delete one of your custom boost roles")
    .addStringOption(option =>
      option
        .setName("rolename")
        .setDescription("Name of the boost role you want to delete")
        .setRequired(true)
    ),

  // 🎁 Claim Boost Role
  new SlashCommandBuilder()
    .setName("claimboostrole")
    .setDescription("Claim your custom role if you recently boosted and missed it"),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🔁 Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands registered successfully.");
  } catch (err) {
    console.error("❌ Failed to register slash commands:", err);
  }
})();
