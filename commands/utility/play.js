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

async function execute(interaction) {
	if (!interaction.deferred && !interaction.replied) {
		await interaction.deferReply();
	}

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
		// Get audio stream with retry logic
		let stream;
		let retries = 3;
		let lastError;

		while (retries > 0) {
			try {
				let videoUrl = query;
				let searchResult;

				if (!ytdl.validateURL(query)) {
					searchResult = await search(query, { limit: 1 });
					if (!searchResult[0]) {
						return interaction.editReply('No results found for your query');
					}
					videoUrl = searchResult[0].url;
				}

				// Try different quality options if 410 error occurs
				const qualityOptions = ['highestaudio', 'lowestaudio'];
				let lastError;

				for (const quality of qualityOptions) {
					try {
						stream = ytdl(videoUrl, {
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

						// If we get here, the stream is valid
						break;
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

				if (!stream) {
					if (lastError && lastError.message.includes('410')) {
						throw new Error('The requested video is no longer available');
					}
					throw lastError || new Error('Failed to create audio stream');
				}

				// Handle signature extraction errors
				stream.on('error', (error) => {
					if (error.message.includes('Could not extract functions')) {
						console.error(
							'Signature extraction failed, retrying with different options...'
						);
						stream = ytdl(query || searchResults[0].url, {
							filter: 'audioonly',
							quality: 'lowestaudio',
							highWaterMark: 1 << 25,
							requestOptions: {
								headers: {
									'User-Agent':
										'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
								},
							},
						});
					}
					throw error;
				});

				// Test the stream
				stream.on('error', (error) => {
					throw error;
				});

				// If we get here, the stream is valid
				break;
			} catch (error) {
				lastError = error;
				retries--;
				if (retries > 0) {
					console.log(`Stream error, retrying... (${retries} attempts left)`);
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}
		}

		if (!stream) {
			throw lastError || new Error('Failed to create audio stream');
		}

		// Join voice channel with error handling
		let connection;
		try {
			connection = joinVoiceChannel({
				channelId: voiceChannel.id,
				guildId: interaction.guild.id,
				adapterCreator: interaction.guild.voiceAdapterCreator,
			});
			console.log('Successfully joined voice channel');
		} catch (error) {
			console.error('Error joining voice channel:', error);
			throw new Error('Failed to join voice channel: ' + error.message);
		}

		// Create audio player with detailed error handling
		let player;
		try {
			player = createAudioPlayer({
				behaviors: {
					noSubscriber: 'pause',
					maxMissedFrames: 250,
				},
			});
			console.log('Audio player created successfully');
		} catch (error) {
			console.error('Error creating audio player:', error);
			connection.destroy();
			throw new Error('Failed to create audio player: ' + error.message);
		}

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

		// Set up connection and player with detailed error handling
		try {
			// Verify connection state
			if (!connection.state.subscription) {
				console.log('Subscribing player to connection...');
				connection.subscribe(player);
				console.log('Successfully subscribed player to connection');
			}

			// Verify player state
			if (player.state.status === AudioPlayerStatus.Idle) {
				console.log('Starting audio playback...');
				player.play(resource);

				// Wait for playback to start
				await new Promise((resolve, reject) => {
					const timeout = setTimeout(() => {
						reject(new Error('Playback timeout'));
					}, 5000);

					player.on(AudioPlayerStatus.Playing, () => {
						clearTimeout(timeout);
						resolve();
					});

					player.on('error', (error) => {
						clearTimeout(timeout);
						reject(error);
					});
				});

				console.log('Audio playback started successfully');
			} else {
				console.log('Player is already in state:', player.state.status);
			}
		} catch (error) {
			console.error('Error starting playback:', error);
			try {
				connection.destroy();
			} catch (destroyError) {
				console.error('Error destroying connection:', destroyError);
			}
			throw new Error('Failed to start playback: ' + error.message);
		}

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
