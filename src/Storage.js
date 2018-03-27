import Utils from './Utils';

const CACHE_KEY = '_scribe_';
const TTL = 2000;
const getDataKey = (key) => CACHE_KEY + '_data_' + key;
const getMetaKey = (key) => CACHE_KEY + '_meta_' + key;
const getRootKeyFromMetaKey = (metaKey) => metaKey.replace(CACHE_KEY + '_meta_', '');

class StoreState {
	constructor(state = Object.create(null)) {
		this.firstState = state;
		this.state = null;
		this.changedProps = Object.create(null);
	}

	setState(newState) {
		this.state = newState;
	}

	getFirstState() {
		return this.firstState;
	}

	getState() {
		return this.state;
	}

	addChanges(props) {
		props.forEach((prop) => {this.changedProps[prop] = true;});
	}

	getPendingChanges() {
		return Object.keys(this.changedProps);
	}

	clearPendingChanges() {
		this.changedProps = Object.create(null);
		this.state = null;
	}
}

class MetaData {
	constructor(data = {patchList: [], lastUpdate: Date.now(), ttl: TTL}) {
		this.data = data;
	}

	getPatches() {
		return this.data.patchList || [];
	}

	getLastUpdate() {
		return parseInt(this.data.lastUpdate);
	}

	getTTL() {
		return parseInt(this.data.ttl);
	}

	toString() {
		return JSON.stringify(this.data);
	}

	didExpire() {
		return Date.now() - this.getLastUpdate() > this.getTTL();
	}
}

class Storage {

	constructor() {

		// task queue
		this._queue = [];

		// memoized reader
		this.read = Utils.memoize(this.read.bind(this));

		// keeps track of each store changes
		this._storeMap = Object.create(null);

		// processing function / reconciler
		this._processor = Utils.getLeastPriortizedFunction(this._processor.bind(this), 1000);

		// garbage collection stuff
		this._garbageCollected = false;
		this._purgables = {};

	}

	read(key, fallback = Object.create(null)) {

		return new Promise((resolve, reject) => {

			Promise.all([Utils.readData(getDataKey(key)), Utils.readData(getMetaKey(key))]).then(([data = Object.create(null), meta]) => {

				meta = new MetaData(meta);

				if (meta.didExpire()) {
					this._storeMap[key] = new StoreState();
					this._purgables[getMetaKey(key)] = true; // mark for GC
					resolve(fallback);
				}
				else {
					// apply patches
					let nextState = Utils.applyPatches(data, meta.getPatches());

					Utils.writeData(getDataKey(key), nextState).then(() => {
						this._storeMap[key] = new StoreState(Utils.deepClone(nextState));
						resolve(nextState);
					}).catch(() => {
						resolve(fallback);
					});
				}

			}).catch(() => {
				resolve(fallback);
			});

		});

	}

	/**
	 * Schdules next write and returns
	 * @param key
	 * @param nextState
	 * @param nextProps
	 */
	write(key, nextState = Object.create(null), nextProps = Object.keys(nextState)) {

		// update store state
		this._storeMap[key].setState(nextState);
		this._storeMap[key].addChanges(nextProps);

		// schedule actual writes
		this._queue.indexOf(key) === -1 && this._queue.push(key);
		this._processor();
	}

	_processor() {

		if(!this._queue || this._queue.length < 1) {
			// nothing to process, see if we can clean up old caches
			if(this._garbageCollected === false) {
				this._collectGarbage();
			}
			else {
				return;
			}
		}

		let nextStoreKey = this._queue.shift();

		let currentStoreObject = this._storeMap[nextStoreKey];
		let patches = [];
		let pendingChanges = currentStoreObject.getPendingChanges();

		if(pendingChanges.length) {

			pendingChanges.forEach((prop) => {
				// todo optimize
				patches.push(Utils.findDiffs(currentStoreObject.getState()[prop], currentStoreObject.getFirstState()[prop]));
			});

			patches = Utils.optimizePatches(patches);

			let newMetaData = new MetaData({
				patchList: patches,
				lastUpdate: Date.now()
			});

			Utils.writeData(getMetaKey(nextStoreKey), newMetaData).then(() => {
				currentStoreObject.clearPendingChanges();
			});
		}

		// call again?
		// this._processor();

	}

	/**
	 * Iterates all keys and clears if necessary
	 * @private
	 */
	_collectGarbage() {

		if(this._garbageCollected)
			return;

		Utils.iterateKeys((data, key) => {
			if(key.indexOf(getDataKey('')) > -1 && this.shouldPurge(data, key) === true) {
				this.purge(key);
			}
		}).then(() => {
			this._garbageCollected = true;
		}).catch(function(err) {
			// todo handle errors
		});

	}

	/**
	 * Decide if data is to be purged
	 * @param metaData
	 * @param metaKey
	 * @returns {boolean|*}
	 */
	shouldPurge(metaData, metaKey) {
		if(this._purgables[metaKey] === true)
			return true;
		else {
			metaData = new MetaData(metaData);
			return metaData.didExpire();
		}
	}

	/**
	 * Delete a data object based on metaKey
	 * @param metaKey
	 */
	purge(metaKey) {
		let rootKey = getRootKeyFromMetaKey(metaKey);
		Utils.deleteData(getDataKey(rootKey));
		Utils.deleteData(getMetaKey(rootKey));
		// todo clear purgables ?
	}

}


export default new Storage();