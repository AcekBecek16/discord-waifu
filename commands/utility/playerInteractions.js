const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
} = require('discord.js');
const { search } = require('play-dl');
const ytdl = require('ytdl-core');

module.exports = {
	handleInteraction: async (interaction) => {
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
	},
};

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
