/*!
* Hawkevents, a queryable event emitter
* Originally created in Hawkejs
*
* https://github.com/skerit/hawkevents
*
* Copyright (c) 2013-2014 Jelle De Loecker <jelle@codedor.be>
* Licensed under the MIT license.
*/
;!function(undefined) {

	/**
	 * The Hawkevents constructor
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.8
	 * @version  0.1.0
	 */
	function Hawkevents() {

		// Queryable listeners
		this.queue = [];

		// Regular string listeners
		this.listeners = {};

		// Which events have we seen, with emitted objects
		this.seenQueue = [];

		// Which events have we seen?
		this.seenEvents = {};
	};

	/**
	 * Emit an event
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.8
	 * @version  0.1.0
	 *
	 * @param    {Object}   identifier   An object containing identifiers
	 * @param    {Mixed}    data         Data to give to the callbacks
	 * @param    {Function} callback     Function to execute when events have fired
	 */
	Hawkevents.prototype.emit = function emit(identifier, data, callback) {

		var remove,
		    idIsString,
		    idObject,
		    listener,
		    doit,
		    name,
		    ctx,
		    i;

		idIsString = (typeof identifier === 'string');

		if (typeof data === 'function') {
			callback = data;
			data = undefined;
		}

		// Create a context
		ctx = {
			'stop': function() {
				ctx.prevent = true;
			},
			'prevent': false
		};

		remove = [];

		// If the identifier is a simple string
		if (idIsString) {

			this.seenEvents[identifier] = true;

			// See if any listeners are provided
			if (this.listeners[identifier]) {

				for (i = 0; i < this.listeners[identifier].length; i++) {
					listener = this.listeners[identifier][i];

					listener.callback.call(ctx, identifier, data);

					// If the amount to run this event is bigger than 0, do some checks
					if (listener.amount > 0) {

						// Decrease the amount it can run by one
						listener.amount--;

						// If it has hit zero now, remove it later
						if (listener.amount === 0) {
							remove.push(i);
						}
					}
				}

				if (remove.length) {
					remove.reverse();

					for (i = 0; i < remove.length; i++) {
						this.listeners[identifier].splice(remove[i], 1);
					}
				}
			}
		} else {

			this.seenQueue.push(identifier);

			// Go over every listener in the queue
			for (i = 0; i < this.queue.length; i++) {
				listener = this.queue[i];

				// See if this should be done
				doit = this.matchQuery(identifier, listener.query);

				if (doit && !ctx.prevent) {
					listener.callback.call(ctx, identifier, data);

					// If the amount to run this event is bigger than 0, do some checks
					if (listener.amount > 0) {

						// Decrease the amount it can run by one
						listener.amount--;

						// If it has hit zero now, remove it later
						if (listener.amount === 0) {
							remove.push(i);
						}
					}
				}
			}

			// If we've added any listener nrs to be removed
			if (remove.length) {
				// Reverse the remove array
				remove.reverse();

				// Now remove the old entries
				for (i = 0; i < remove.length; i++) {
					this.queue.splice(remove[i], 1);
				}
			}
		}

		if (callback && !ctx.prevent) callback();
	};

	/**
	 * Emit an event if it hasn't been emitted before
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}   identifier   An object containing identifiers
	 * @param    {Mixed}    data         Data to give to the callbacks
	 * @param    {Function} callback     Function to execute when events have fired
	 */
	Hawkevents.prototype.emitOnce = function emitOnce(identifier, data, callback) {

		var idIsString = (typeof identifier === 'string'),
		    match,
		    i;

		if (idIsString) {
			if (this.seenEvents[identifier]) {
				return;
			}
		} else {
			// See if the query matches any emitted events
			for (i = 0; i < this.seenQueue.length; i++) {
				if(this.matchQuery(identifier, this.seenQueue[i])) {
					return;
				}
			}
		}

		// No matches were found, so we can emit it
		this.emit(identifier, data, callback);
	};

	/**
	 * See if the emitted (a) matches the listener (b)
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 */
	Hawkevents.prototype.matchQuery = function matchQuery(a, b) {

		var listener,
		    aString,
		    bString,
		    name;

		// If both are completely equal (as strings should be) it's true
		if (a === b) {
			return true;
		}

		aString = typeof a === 'string';
		bString = typeof b === 'string';

		// If one of them is a string, return false (since it failed the previous test)
		if (aString || bString) {
			return false;
		}

		// All the conditions in the listener must be matched
		for (name in b) {
			if (a[name] != b[name]) {
				return false;
			}
		}

		return true;
	};

	/**
	 * Listen to an event the given amount of times
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.8
	 * @version  0.1.0
	 *
	 * @param    {Object}   query     A query object, with conditions
	 * @param    {Number}   amount    The amount of times this callback can fire
	 * @param    {Function} callback  The function to execute
	 */
	Hawkevents.prototype.listen = function listen(query, amount, callback) {

		var i;

		// If the query isn't array, turn it into one
		if (!Array.isArray(query)) {
			query = [query];
		}

		// Add a listener for every query in the array
		for (i = 0; i < query.length; i++) {

			if (typeof query[i] === 'string') {
				if (!this.listeners[query[i]]) {
					this.listeners[query[i]] = [];
				}

				this.listeners[query[i]].push({amount: amount||-1, callback: callback});
			} else {
				this.queue.push({query: query[i], amount: amount||-1, callback: callback})
			}
		}
	};

	/**
	 * Listen to an event every time
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.8
	 * @version  0.0.8
	 *
	 * @param    {Object}   query     A query object, with conditions
	 * @param    {Function} callback  The function to execute
	 */
	Hawkevents.prototype.on = function on(query, callback) {
		this.listen(query, -1, callback);
	};

	/**
	 * Do an event once
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.8
	 * @version  0.0.8
	 *
	 * @param    {Object}   query     A query object, with conditions
	 * @param    {Function} callback  The function to execute
	 */
	Hawkevents.prototype.once = function once(query, callback) {
		this.listen(query, 1, callback);
	};

	/**
	 * Do something after the given query has fired,
	 * even if that was in the past
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 */
	Hawkevents.prototype.after = function after(query, callback) {

		var emitter,
		    doit,
		    i;

		if (typeof query === 'string') {
			if (this.seenEvents[query]) {
				doit = true;
			}
		} else {
			for (i = 0; i < this.seenQueue.length; i++) {
				emitter = this.seenQueue[i];

				if (this.matchQuery(emitter, query)) {
					doit = true;
					break;
				}
			}
		}

		if (doit) {
			callback();
		} else {
			this.on(query, callback);
		}
	};

	if (typeof define === 'function' && define.amd) {
		 // AMD. Register as an anonymous module
		define(function() {
			return EventEmitter;
		});
	} else if (typeof exports === 'object') {
		// CommonJS
		module.exports = Hawkevents;
	}
	else {
		// Browser global
		window.Hawkevents = Hawkevents;
	}

}();