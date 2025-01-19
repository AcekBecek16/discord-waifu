const { SlashCommandBuilder } = require('discord.js');
const {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	AudioPlayerStatus,
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { search } = require('play-dl');

const data = new SlashCommandBuilder()
	.setName('play')
	.setDescription('Play a song from YouTube')
	.addStringOption((option) =>
		option
			.setName('query')
			.setDescription('YouTube URL or search query')
			.setRequired(true)
	);

async function execute(interaction) {
	await interaction.deferReply();

	const query = interaction.options.getString('query');
	const voiceChannel = interaction.member.voice.channel;

	if (!voiceChannel) {
		return interaction.editReply(
			'You need to be in a voice channel to play music!'
		);
	}

	try {
		// Get audio stream
		let stream;
		if (ytdl.validateURL(query)) {
			stream = ytdl(query, { filter: 'audioonly', quality: 'highestaudio' });
		} else {
			const searchResults = await search(query, { limit: 1 });
			if (!searchResults[0]) {
				return interaction.editReply('No results found for your query');
			}
			stream = ytdl(searchResults[0].url, {
				filter: 'audioonly',
				quality: 'highestaudio',
			});
		}

		// Join voice channel
		const connection = joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: interaction.guild.id,
			adapterCreator: interaction.guild.voiceAdapterCreator,
		});

		// Create audio player
		const player = createAudioPlayer();
		const resource = createAudioResource(stream);

		player.play(resource);
		connection.subscribe(player);

		// Handle player events
		player.on(AudioPlayerStatus.Idle, () => {
			connection.destroy();
		});

		player.on('error', (error) => {
			console.error('Error:', error);
			interaction.editReply('An error occurred while playing the song');
			connection.destroy();
		});

		await interaction.editReply('Now playing your song!');
	} catch (error) {
		console.error('Error:', error);
		await interaction.editReply(
			'An error occurred while trying to play the song'
		);
	}
}

module.exports = {
	data,
	execute,
};
