const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const commands = [
  new SlashCommandBuilder()
    .setName("simulateboost")
    .setDescription("Simulate a server boost (ADMIN ONLY)"),

  new SlashCommandBuilder()
    .setName("deletemyboostrole")
    .setDescription("Delete your current boost role and allow re-submission"),

  new SlashCommandBuilder()
    .setName("claimboostrole")
    .setDescription("Claim your custom role if you recently boosted and missed it"),
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🔁 Registering commands...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands registered successfully.");
  } catch (err) {
    console.error("❌ Failed to register slash commands:", err);
  }
})();
