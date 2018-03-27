import Store from './Store';
import Storage from './Storage';

export default class PersistentStore extends Store {

	constructor(...args) {
		super(...args);
		this.ID = this.constructor.name;
	}

	get(attr) {

		if(this._initialized === true)
			return super.get(attr);

		return new Promise((resolve, reject) => {
			Storage.read(this.ID, this.state).then((firstState) => {
				super.set(firstState);
				this._initialized = true;
				resolve(firstState);
			}).catch((e) => {
				this._initialized = true;
				super.get(attr).then(resolve);
			});
		});
	}

	set(attr, val) {

		super.set(attr, val);

		let changedProps = typeof attr === 'string' ? [attr] : Object.keys(attr);
		Storage.write(this.ID, this.state, changedProps);
	}

}