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

	// Check if bot has permission to join and speak in the channel
	if (!voiceChannel.joinable || !voiceChannel.speakable) {
		return interaction.editReply(
			"I don't have permission to join or speak in that voice channel!"
		);
	}

	console.log(
		`Attempting to join voice channel: ${voiceChannel.name} (${voiceChannel.id}) in guild ${interaction.guild.name}`
	);

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

		// Validate stream
		if (!stream) {
			throw new Error('Failed to create audio stream');
		}

		// Join voice channel
		const connection = joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: interaction.guild.id,
			adapterCreator: interaction.guild.voiceAdapterCreator,
		});

		// Create audio player with error handling
		const player = createAudioPlayer({
			behaviors: {
				noSubscriber: 'pause',
				maxMissedFrames: 250,
			},
		});

		// Create audio resource with error handling
		const resource = createAudioResource(stream, {
			inlineVolume: true,
			metadata: {
				requestedBy: interaction.user.tag,
			},
		});

		// Validate resource
		if (!resource) {
			connection.destroy();
			throw new Error('Failed to create audio resource');
		}

		// Set up connection and player
		connection.subscribe(player);
		player.play(resource);

		// Handle player events
		player.on(AudioPlayerStatus.Idle, () => {
			try {
				connection.destroy();
			} catch (error) {
				console.error('Error destroying connection:', error);
			}
		});

		player.on('error', (error) => {
			console.error('Player Error:', error);
			interaction.editReply('An error occurred while playing the song');
			try {
				connection.destroy();
			} catch (error) {
				console.error('Error destroying connection:', error);
			}
		});

		connection.on('stateChange', (oldState, newState) => {
			console.log(
				'Connection state changed:',
				oldState.status,
				'->',
				newState.status
			);
		});

		connection.on('error', (error) => {
			console.error('Connection Error:', error);
			interaction.editReply('An error occurred with the voice connection');
			try {
				connection.destroy();
			} catch (error) {
				console.error('Error destroying connection:', error);
			}
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
