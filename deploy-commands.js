const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const commands = [
  new SlashCommandBuilder()
  .setName("say")
  .setDescription("Send a message as the bot (only for owner)")
  .addStringOption(option =>
    option
      .setName("message")
      .setDescription("What should the bot say?")
      .setRequired(true)
  ),

  new SlashCommandBuilder()
    .setName("simulateboost")
    .setDescription("Simulate a server boost (ADMIN ONLY)"),

  new SlashCommandBuilder()
    .setName("deletemyboostrole")
    .setDescription("Delete one of your custom boost roles")
    .addStringOption(option =>
      option
        .setName("rolename")
        .setDescription("Name of the boost role you want to delete")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("claimboostrole")
    .setDescription("Claim your custom role if you recently boosted and missed it"),
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🧼 Clearing old slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [] }
    );
    console.log("✅ Old commands cleared.");

    console.log("🔁 Registering fresh slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands registered successfully.");
  } catch (err) {
    console.error("❌ Failed to register slash commands:", err);
  }
})();
