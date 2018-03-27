import Utils from './Utils';
import {getRootKeyFromMetaKey, getDataKey, getMetaKey} from './Constants';

class GarbageCollector {

	constructor() {
		this._completed = false;
		this._purgables = {};
		this._gcProcess = Utils.getLeastPriortizedFunction(this._gcProcess, 2000);
	}

	/**
	 * Every call to trigger just delays the execution of purging ;)
	 */
	trigger() {
		this._gcProcess();
	}

	/**
	 * Manually GC a metaKey
	 * @param metaKey
	 */
	addToPurge(metaKey) {
		this._purgables[metaKey] = true;
	}

	/**
	 * Purging process
	 * @private
	 */
	_gcProcess() {
		if(this._completed)
			return;

		Utils.iterateMetaKeys((metaData, metaKey) => {
			if(this.shouldPurge(metaData, metaKey) === true) {
				this.purge(metaKey);
			}
		}).then(() => {
			this._completed = true;
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
		return (this._purgables[metaKey] === true || Utils.isDataStale(metaData.lastUpdate, metaData.ttl));
	}

	/**
	 * Delete a data object based on metaKey
	 * @param metaKey
	 */
	purge(metaKey) {
		let rootKey = getRootKeyFromMetaKey(metaKey);
		Utils.deleteData(getDataKey(rootKey));
		Utils.deleteData(metaKey);
		// todo clear purgables ?
	}

}

export default new GarbageCollector();