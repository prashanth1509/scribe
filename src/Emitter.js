class Emitter {

	constructor(options = {}) {
		this.data = Object.create(null);
		this.counter = 0;
		this.options = Object.assign({
			skipExceptions: true
		}, options);
	}

 	subscribe(event, callback) {
		if(this.data.hasOwnProperty(event) === false)
			this.data[event] = Object.create(null);
		
		let cid = this.counter++;
		
		this.data[event][cid] = callback;

		// optimized for unsubscription
		return {
			unsubscribe() {
				delete this.data[event][cid];
			}
		};
	}

	emit(event, ...args) {
		
		let errors = [];
		
		if(this.data.hasOwnProperty(event)) {
			Object.keys(this.data[event]).forEach((cid) => {
				let fn = this.data[event][cid];
				try {
					fn.apply(event, args);
				}
				catch (e) {
					if(this.options.skipExceptions) {
						errors.push(e);
					}
					else {
						throw new Error(e);
					}
				}
			});
		}
		else {
			errors.push(new Error('Invalid event: ' + event));
		}
		
		return errors;
	}

}