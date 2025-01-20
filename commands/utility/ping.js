const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Test Connection'),
	async execute(interaction) {
		try {
			await interaction.reply(`Test Connection by ${interaction.user.tag}`);
		} catch (error) {
			console.error(error);
			await interaction.reply('An error occurred while checking the case.');
		}
	},
};
