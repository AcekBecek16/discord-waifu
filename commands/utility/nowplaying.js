const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require('discord.js');
const { createAudioResource } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { search } = require('play-dl');

const data = new SlashCommandBuilder()
	.setName('nowplaying')
	.setDescription('Show currently playing song information');

let currentSong = null;
let startTime = null;

function setCurrentSong(songInfo) {
	currentSong = songInfo;
	startTime = Date.now();
}

async function execute(interaction) {
	if (!currentSong) {
		return interaction.reply({
			content: 'No song is currently playing!',
			ephemeral: true,
		});
	}

	const elapsed = Date.now() - startTime;
	const progress = Math.min((elapsed / currentSong.duration) * 100, 100);

	const embed = new EmbedBuilder()
		.setColor('#0099ff')
		.setTitle(currentSong.title)
		.setURL(currentSong.url)
		.setAuthor({ name: currentSong.artist })
		.setThumbnail(currentSong.thumbnail)
		.addFields(
			{
				name: 'Duration',
				value: formatDuration(currentSong.duration),
				inline: true,
			},
			{ name: 'Progress', value: createProgressBar(progress), inline: true }
		)
		.setTimestamp();

	const row = new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId('lyrics')
			.setLabel('Lyrics')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId('related')
			.setLabel('Related Tracks')
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId('artist')
			.setLabel('Artist Info')
			.setStyle(ButtonStyle.Success)
	);

	await interaction.reply({ embeds: [embed], components: [row] });
}

function formatDuration(milliseconds) {
	const totalSeconds = Math.floor(milliseconds / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function createProgressBar(percentage) {
	const filled = '▰';
	const empty = '▱';
	const total = 20;
	const filledCount = Math.round((percentage / 100) * total);
	return filled.repeat(filledCount) + empty.repeat(total - filledCount);
}

module.exports = {
	data,
	execute,
	setCurrentSong,
};
