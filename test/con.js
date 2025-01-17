const sendRequest = async (taging) => {
	const apiUrl = 'https://api.waifu.im/search';
	const params = {
		included_tags: taging,
		height: '>=2000',
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
		headers.append(
			'Authorization',
			'Bearer n5caCsTPtG-uGmfjtOwfz0HlDj8HtXiwt7ksPAIUZ46p0k7LQtdKOvyEe23TUmJt2a4h9EnBVBWaWAc3ESVkOpgriXkmhNsDbSuzXaaw5B38w4thNRHLf68tU9ETaMG17TsrzyJxtBuqHSBQ9zoZ0qQR7ReIvYeLmDNbWobaHvE'
		);

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

sendRequest('ass').then((res) => {
	console.log(res);
});
