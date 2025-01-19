const {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
} = require('discord.js');
const { search } = require('play-dl');
const ytdl = require('ytdl-core');

// Command data
const data = new SlashCommandBuilder()
	.setName('player')
	.setDescription('Control the music player')
	.addSubcommand((subcommand) =>
		subcommand.setName('controls').setDescription('Show player controls')
	);

// Command execution
async function execute(interaction) {
	if (!interaction.isChatInputCommand()) return;

	switch (interaction.options.getSubcommand()) {
		case 'controls':
			await showControls(interaction);
			break;
	}
}

// Interaction handling
async function handleInteraction(interaction) {
	if (!interaction.isButton()) return;

	try {
		switch (interaction.customId) {
			case 'lyrics':
				await handleLyrics(interaction);
				break;
			case 'related':
				await handleRelatedTracks(interaction);
				break;
			case 'artist':
				await handleArtistInfo(interaction);
				break;
		}
	} catch (error) {
		console.error('Interaction error:', error);
		await interaction.reply({
			content: 'An error occurred while processing your request',
			ephemeral: true,
		});
	}
}

// Subcommand functions
async function showControls(interaction) {
	const embed = new EmbedBuilder()
		.setColor('#0099ff')
		.setTitle('Player Controls')
		.setDescription('Use these controls to manage playback');

	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId('pause')
			.setLabel('Pause')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('skip')
			.setLabel('Skip')
			.setStyle(ButtonStyle.Secondary)
	);

	await interaction.reply({ embeds: [embed], components: [row] });
}

// Interaction handlers
async function handleLyrics(interaction) {
	await interaction.reply({
		content: 'Lyrics feature coming soon!',
		ephemeral: true,
	});
}

async function handleRelatedTracks(interaction) {
	const message = await interaction.message.fetch();
	const embed = message.embeds[0];
	const videoUrl = embed.url;

	const info = await ytdl.getInfo(videoUrl);
	const relatedVideos = info.related_videos.slice(0, 5);

	const embedContent = new EmbedBuilder()
		.setColor('#0099ff')
		.setTitle('Related Tracks')
		.setDescription(
			relatedVideos
				.map((video, index) => `${index + 1}. [${video.title}](${video.url})`)
				.join('\n')
		);

	await interaction.reply({ embeds: [embedContent], ephemeral: true });
}

async function handleArtistInfo(interaction) {
	const message = await interaction.message.fetch();
	const embed = message.embeds[0];
	const artistName = embed.author.name;

	const searchResults = await search(artistName, { limit: 1 });
	if (!searchResults[0]) {
		return interaction.reply({
			content: 'No artist information found',
			ephemeral: true,
		});
	}

	const embedContent = new EmbedBuilder()
		.setColor('#0099ff')
		.setTitle(artistName)
		.setDescription(`[View on YouTube](${searchResults[0].url})`)
		.setThumbnail(searchResults[0].thumbnails[0].url);

	await interaction.reply({ embeds: [embedContent], ephemeral: true });
}

module.exports = {
	data,
	execute,
	handleInteraction,
};
