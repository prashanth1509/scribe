import Emitter from './Emitter';

export default class Store extends Emitter {

	constructor(initialState = Object.create(null)) {
		this.state = initialState;
	}

	get(attr) {
		return Promise.resolve(attr ? this.state[attr] : this.state);
	}

	set(attr, val) {
		if (typeof attr === 'object') {
			Object.assign(this.state, attr);
		}
		else {
			this.state[attr] = val;
		}
	}

}