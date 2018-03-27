let BASE_KEY = '_scribe_';

export default {
	getDataKey(root = '') {
		return BASE_KEY + '_data_' + root;
	},
	getMetaKey(root = '') {
		return BASE_KEY + '_meta_' + root;

	},
	getRootKeyFromMetaKey(metaKey) {
		return metaKey.replace(this.getMetaKey(''), '');
	},
	BASE_KEY,
	DEFAULT_TTL: 2000
};