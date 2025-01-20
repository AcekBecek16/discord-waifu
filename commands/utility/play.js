const { SlashCommandBuilder } = require('discord.js');
const {
	joinVoiceChannel,
	createAudioPlayer,
	createAudioResource,
	AudioPlayerStatus,
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { search } = require('play-dl');
const { setCurrentSong } = require('./nowplaying');

const data = new SlashCommandBuilder()
	.setName('play')
	.setDescription('Play a song from YouTube')
	.addStringOption((option) =>
		option
			.setName('query')
			.setDescription('YouTube URL or search query')
			.setRequired(true)
	);

const yts = require('yt-search'); // Add this at the top of your file

// Helper function to search for YouTube videos
async function execute(interaction) {
	if (!interaction.deferred && !interaction.replied) {
		await interaction.deferReply();
	}

	const query = interaction.options.getString('query');
	const voiceChannel = interaction.member.voice.channel;

	// Validate voice channel
	if (!voiceChannel) {
		return interaction.editReply(
			'You need to be in a voice channel to play music!'
		);
	}

	if (!voiceChannel.joinable || !voiceChannel.speakable) {
		return interaction.editReply(
			"I don't have permission to join or speak in that voice channel!"
		);
	}

	console.log(
		`Attempting to join voice channel: ${voiceChannel.name} (${voiceChannel.id}) in guild ${interaction.guild.name}`
	);

	try {
		let videoUrl;

		// Check if the query is a valid YouTube URL
		if (ytdl.validateURL(query)) {
			videoUrl = query;
		} else {
			// Search for the song using the query
			videoUrl = await searchYouTube(query);
		}

		// Create audio stream with retry logic
		const stream = await createAudioStream(videoUrl);
		if (!stream) {
			throw new Error('Failed to create audio stream');
		}

		// Join voice channel
		const connection = joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: interaction.guild.id,
			adapterCreator: interaction.guild.voiceAdapterCreator,
		});
		console.log('Successfully joined voice channel');

		// Create audio player
		const player = createAudioPlayer({
			behaviors: {
				noSubscriber: 'pause',
				maxMissedFrames: 250,
			},
		});
		console.log('Audio player created successfully');

		// Create audio resource
		const resource = createAudioResource(stream, {
			inlineVolume: true,
			metadata: {
				requestedBy: interaction.user.tag,
			},
		});

		// Subscribe player to connection
		connection.subscribe(player);
		console.log('Successfully subscribed player to connection');

		// Start playback
		player.play(resource);
		console.log('Audio playback started successfully');

		// Handle player events
		player.on(AudioPlayerStatus.Idle, () => {
			console.log('Playback finished');
			connection.destroy();
		});

		player.on('error', (error) => {
			console.error('Player Error:', error);
			interaction.editReply('An error occurred while playing the song');
			connection.destroy();
		});

		connection.on('error', (error) => {
			console.error('Connection Error:', error);
			interaction.editReply('An error occurred with the voice connection');
			connection.destroy();
		});

		await interaction.editReply(`Now playing: ${videoUrl}`);
	} catch (error) {
		console.error('Error:', error);
		await interaction.editReply(
			'An error occurred while trying to play the song'
		);
	}
}

// Helper function to search for YouTube videos
async function searchYouTube(query) {
	try {
		const searchResults = await yts(query);
		if (!searchResults.videos.length) {
			throw new Error('No results found for your query');
		}
		return searchResults.videos[0].url; // Return the URL of the first result
	} catch (error) {
		console.error('Search Error:', error);
		throw new Error('Failed to search for the song');
	}
}

// Helper function to create audio stream with retry logic
async function createAudioStream(videoUrl) {
	const qualityOptions = ['highestaudio', 'lowestaudio'];
	let lastError;

	for (const quality of qualityOptions) {
		try {
			const stream = ytdl(videoUrl, {
				filter: 'audioonly',
				quality: quality,
				highWaterMark: 1 << 25,
				requestOptions: {
					headers: {
						'User-Agent':
							'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
					},
				},
				retryOptions: {
					maxRetries: 3,
					backoff: {
						initial: 1000,
						max: 5000,
					},
				},
			});

			// Test the stream
			await new Promise((resolve, reject) => {
				stream.on('error', reject);
				stream.on('response', resolve);
			});

			return stream;
		} catch (error) {
			lastError = error;
			if (error.message.includes('410')) {
				console.log(
					`Video unavailable with quality ${quality}, trying next option...`
				);
				continue;
			}
			throw error;
		}
	}

	if (lastError && lastError.message.includes('410')) {
		throw new Error('The requested video is no longer available');
	}
	throw lastError || new Error('Failed to create audio stream');
}

module.exports = {
	data,
	execute,
};
