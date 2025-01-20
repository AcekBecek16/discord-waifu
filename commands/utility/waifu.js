const {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	SlashCommandBuilder,
} = require('discord.js');
const dotenv = require('dotenv');
dotenv.config();

const sendRequest = async (taging) => {
	const apiUrl = 'https://api.waifu.im/search'; // Replace with the actual API endpoint URL
	const params = {
		included_tags: taging,
		height: '>=1000',
	};

	const queryParams = new URLSearchParams();

	for (const key in params) {
		if (Array.isArray(params[key])) {
			params[key].forEach((value) => {
				queryParams.append(key, value);
			});
		} else {
			queryParams.set(key, params[key]);
		}
	}
	const requestUrl = `${apiUrl}?${queryParams.toString()}`;

	try {
		const headers = new Headers();
		headers.append('Accept-Version', 'v5');
		headers.append('Authorization', 'Bearer ' + process.env.waifukey);

		const response = await fetch(requestUrl, { headers });
		if (!response.ok) {
			throw new Error('Request failed with status code: ' + response.status);
		}
		const data = await response.json(); // No need to parse JSON manually, fetch does it
		const imageUrl = data.images[0].url; // Use the correct key for the image URL
		return imageUrl;
	} catch (error) {
		console.error('An error occurred:', error.message);
		return null; // Return null or handle the error as needed
	}
};

const data = new SlashCommandBuilder()
	.setName('waifu')
	.setDescription('what ur fetish brooo!!')
	.addStringOption((option) =>
		option
			.setName('urwaifu')
			.setDescription('choos ur type dude')
			.addChoices(
				{ name: 'errrr', value: 'ero' },
				{ name: 'aa$$', value: 'ass' },
				{ name: 'oolllll', value: 'oral' },
				{ name: 'come', value: 'milf' },
				{ name: 'yoo', value: 'maid' },
				{ name: 'qqqqq', value: 'mori-calliope' },
				{ name: 'hahaha', value: 'uniform' },
				{ name: 'wwoooww', value: 'oppai' },
				{ name: 'qweswaa', value: 'hentai' },
				{ name: 'weasw', value: 'paizuri' },
				{ name: 'ecchi', value: 'ecchi' }
			)
			.setRequired(true)
	);

module.exports = {
	data,
	async execute(interaction) {
		await interaction.deferReply();
		const urwaifu = interaction.options.getString('urwaifu');

		await sendRequest(urwaifu).then((res) => {
			interaction.editReply(`${res}`);
		});
	},
};
