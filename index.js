require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const {
	Client,
	Events,
	GatewayIntentBits,
	Collection,
	InteractionType,
} = require('discord.js');
const express = require('express');
const app = express();

app.use(express.json());

const { handleInteraction } = require('./commands/utility/playerInteractions');

const client = new Client({
	intents: [GatewayIntentBits.Guilds],
});
const token = process.env.bot_token;

client.once(Events.ClientReady, (readyClient) => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Register commands
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs
		.readdirSync(commandsPath)
		.filter((file) => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(
				`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
			);
		}
	}
}

// Log in to Discord
client.login(token);
