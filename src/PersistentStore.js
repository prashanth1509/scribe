import Store from './Store';
import Utils from './Utils';
import GarbageCollector from './GarbageCollector';

import {getDataKey, getMetaKey, DEFAULT_TTL} from './Constants';

class PersistentStore extends Store {

	constructor(initialState, options = {ttlMs: DEFAULT_TTL}) {

		super(initialState);

		this._options = options;

		// pending patch queue
		this._pendingPatches = {};

		// de-prioritized patcher
		this._createPatch = Utils.getLeastPriortizedFunction(this._createPatch.bind(this), 1000);

		// Make sure GC is running
		GarbageCollector.trigger();
	}

	get(attr) {
		Utils.invariant(this._initialized === undefined, 'PersistentStore.get should be called after PersistentStore.ready');
		return super.get(attr);
	}

	set(attr, val) {
		super.set(attr, val);
		this._schedulePatching(attr);
	}

	/**
	 * Queues up list of attributes to diff and schedules next patch creation.
	 * @param attr
	 * @private
	 */
	_schedulePatching(attr) {
		let attributesToPatch = typeof attr === 'string' ? [attr] : Object.keys(attr);
		attributesToPatch.forEach((attr) => {
			this._pendingPatches[attr] = true;
		});
		this._createPatch();
	}

	/**
	 * Creates a list of changes from initial object and writes those patches to disk
	 * @private
	 */
	_createPatch() {
		let patchList = [];

		// create patch only when first disk read is ok
		this.ready().then((lastPersistentImmutableState) => {
			Object.keys(this._pendingPatches).forEach((attr) => {
				patchList.push(
					Utils.findDiffs(attr, lastPersistentImmutableState)
				);
			});
		});

		// generate optimized patch list
		patchList = Utils.optimizePatches(patchList);

		// start writing meta data
		let META_KEY = getMetaKey(this.constructor.name);
		let metaData = {
			patchList: patchList,
			lastUpdate: Date.now(),
			ttl: this._options.ttlMs
		};

		Utils.writeData(META_KEY, metaData).then(() => {
			this._pendingPatches = Object.create(null);
		});

	}

	/**
	 * Returns a promise to ensure we read from store after data being loaded from disk
	 * @returns {Promise}
	 */
	ready() {
		this._initialized = true;

		if(!this._storageDataPromise) {

			const DATA_KEY = getDataKey(this.constructor.name), META_KEY = getMetaKey(this.constructor.name);

			this._storageDataPromise = new Promise((resolve, reject) => {

				// read raw data from storage
				Promise.all([Utils.readData(DATA_KEY), Utils.readData(META_KEY)]).then(([data, meta]) => {

					data = data || Object.create(null);
					let {patchList, lastUpdate} = (meta || Object.create(null));

					patchList = patchList || [];
					lastUpdate = lastUpdate || Date.now();

					if(Utils.isDataStale(lastUpdate, this._options.ttlMs) === true) {
						GarbageCollector.addToPurge(META_KEY);
					}
					else {
						data = Utils.applyPatches(data, patchList);

						// write patched data back to disk for once
						Utils.writeData(DATA_KEY, data).then(() => {
							super.set(data);
							// why deep clone?
							// Because createPatch depends on first version of data for patching.
							resolve(Utils.deepClone(data));
						}).catch(() => {
							// error state!
						});

					}

				}).catch(() => {
					// todo handle errors
					reject();
				});

			});
		}

		return this._storageDataPromise;
	}

}