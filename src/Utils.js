import {getMetaKey, DEFAULT_TTL} from './Constants';
import localforage from 'localforage';

export default {

	/**
	 * Takes in two objects and returns an array of paths that is different
	 * @param latest Modified object
	 * @param old Base object
	 */
	findDiffs(latest, old) {
		// todo implement
		// todo use Web workers ;)
	},

	/**
	 * Merge data object with list of patches
	 * @param base
	 * @param patchList List of patch with key as path_string and value as object
	 */
	applyPatches(base, patchList) {
		// todo
	},

	/**
	 * Merge list of patches into optimized patch
	 * @param patchList
	 */
	optimizePatches(patchList) {
		// todo
		return patchList;
	},

	/**
	 * Return a function that has the lowest priority of execution (currently debounce + requestIdleCallback)
	 * @param fn
	 * @param interval
	 * @returns {Function}
	 */
	getLeastPriortizedFunction(fn, interval) {
		let timeout;
		let rIC = window.requestIdleCallback || window.setTimeout;
		return function () {
			timeout && window.clearTimeout(timeout);
			timeout = window.setTimeout(() => {
				rIC(fn.bind(null, ...arguments));
			}, interval);
		}
	},

	/**
	 * Deep clone object
	 * @param obj
	 * @returns {Object}
	 */
	deepClone(obj) {
		return JSON.parse(JSON.stringify(obj));
	},

	/**
	 * Throws error if condition is not met
	 * @param condition
	 * @param message
	 */
	invariant(condition, message) {
		if(condition === true)
			throw new Error(message);
	},

	/**
	 * Reads from storage
	 * @param key
	 * @returns {*}
	 */
	readData(key) {
		return localforage.getItem(key);
	},

	/**
	 * Writes to storage
	 * @param key
	 * @param data
	 * @returns {*}
	 */
	writeData(key, data) {
		return localforage.setItem(key, data);
	},

	/**
	 * Delete key from storage
	 * @param key
	 * @returns {*}
	 */
	deleteData(key) {
		return localforage.removeItem(key);
	},

	/**
	 * Returns all valid scribe prefixed keys
	 */
	iterateMetaKeys(callback) {
		return localforage.iterate(function(value, key, iterationNumber) {
			if(key.indexOf(getMetaKey('')) > -1) {
				callback(value, key);
			}
		});
	},

	/**
	 * Returns if data is stale
	 * @param lastUpdate
	 * @param ttl
	 * @returns {boolean}
	 */
	isDataStale(lastUpdate, ttl = DEFAULT_TTL) {
		return (Date.now() - parseInt(lastUpdate)) > parseInt(ttl);
	}

}