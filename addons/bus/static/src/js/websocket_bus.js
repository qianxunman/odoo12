odoo.define('bus.Websocket', function (require) {
"use strict";

var Bus = require('web.Bus');
var ServicesMixin = require('web.ServicesMixin');


/**
 * Event WebSocket bus used to bind events on the server WebSocket messages
 *
 * trigger:
 * - window_focus : when the window focus change (true for focused, false for blur)
 * - notification : when a notification is receive from the WebSocket
 *
 * @class Websocket
 */
var WebsocketBus = Bus.extend(ServicesMixin, {
    // constants
    PARTNERS_PRESENCE_CHECK_PERIOD: 30000,  // don't check presence more than once every 30s
    RECONNECT_DELAY: 1000, // 1 second initial reconnect delay
    MAX_RECONNECT_DELAY: 30000, // 30 seconds max reconnect delay
    HEARTBEAT_INTERVAL: 30000, // 30 seconds heartbeat interval

    // properties
    _isActive: null,
    _lastNotificationID: 0,
    _isOdooFocused: true,
    _reconnectDelay: 1000,
    _ws: null,
    _heartbeatTimer: null,
    _reconnectTimer: null,

    /**
     * @override
     */
    init: function (parent, params) {
        this._super.apply(this, arguments);
        this._id = _.uniqueId('bus');

        // the _id is modified by crosstab_bus, so we can't use it to unbind the events in the destroy.
        this._websocketBusId = this._id;
        this._options = {};
        this._channels = [];

        // bus presence
        this._lastPresenceTime = new Date().getTime();
        this._lastPartnersPresenceCheck = this._lastPresenceTime;
        $(window).on("focus." + this._websocketBusId, this._onFocusChange.bind(this, {focus: true}));
        $(window).on("blur." + this._websocketBusId, this._onFocusChange.bind(this, {focus: false}));
        $(window).on("unload." + this._websocketBusId, this._onFocusChange.bind(this, {focus: false}));

        $(window).on("click." + this._websocketBusId, this._onPresence.bind(this));
        $(window).on("keydown." + this._websocketBusId, this._onPresence.bind(this));
        $(window).on("keyup." + this._websocketBusId, this._onPresence.bind(this));
    },
    /**
     * @override
     */
    destroy: function () {
        this.stopPolling();
        $(window).off("focus." + this._websocketBusId);
        $(window).off("blur." + this._websocketBusId);
        $(window).off("unload." + this._websocketBusId);
        $(window).off("click." + this._websocketBusId);
        $(window).off("keydown." + this._websocketBusId);
        $(window).off("keyup." + this._websocketBusId);
        this._super();
    },
    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------
    /**
     * Register a new channel to listen on the WebSocket (ignore if already
     * listening on this channel).
     *
     * @param {string} channel
     */
    addChannel: function (channel) {
        if (this._channels.indexOf(channel) === -1) {
            this._channels.push(channel);
            if (this._ws && this._ws.readyState === WebSocket.OPEN) {
                this._sendSubscribe(channel);
            } else {
                this.startPolling();
            }
        }
    },
    /**
     * Unregister a channel from listening on the WebSocket.
     *
     * @param {string} channel
     */
    deleteChannel: function (channel) {
        var index = this._channels.indexOf(channel);
        if (index !== -1) {
            this._channels.splice(index, 1);
            if (this._ws && this._ws.readyState === WebSocket.OPEN) {
                this._sendUnsubscribe(channel);
            }
        }
    },
    /**
     * Tell whether odoo is focused or not
     *
     * @returns {boolean}
     */
    isOdooFocused: function () {
        return this._isOdooFocused;
    },
    /**
     * Start WebSocket connection, i.e. it opens a WebSocket connection
     * and maintains it as long as it is not stopped (@see `stopPolling`)
     */
    startPolling: function () {
        if (this._isActive === null) {
            this._connect = this._connect.bind(this);
        }
        if (!this._isActive) {
            this._isActive = true;
            this._connect();
        }
    },
    /**
     * Stops any started WebSocket connection
     */
    stopPolling: function () {
        this._isActive = false;
        this._channels = [];
        clearTimeout(this._reconnectTimer);
        clearInterval(this._heartbeatTimer);
        if (this._ws) {
            this._ws.close();
            this._ws = null;
        }
    },
    /**
     * Add or update an option on the WebSocket bus.
     * Stored options are sent to the server whenever a connection is established.
     *
     * @param {string} key
     * @param {any} value
     */
    updateOption: function (key, value) {
        this._options[key] = value;
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._sendOptions();
        }
    },
    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    /**
     * returns the last recorded presence
     *
     * @private
     * @returns {integer} number of milliseconds since 1 January 1970 00:00:00
     */
    _getLastPresence: function () {
        return this._lastPresenceTime;
    },
    /**
     * Connect to WebSocket server
     *
     * @private
     */
    _connect: function () {
        var self = this;
        if (!this._isActive) {
            return;
        }

        var session = this.getSession();
        var protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        var wsUrl = protocol + '//' + window.location.host + '/websocket';
        
        try {
            this._ws = new WebSocket(wsUrl);
            
            this._ws.onopen = function() {
                self._reconnectDelay = self.RECONNECT_DELAY;
                self._sendInitialData();
                self._startHeartbeat();
            };
            
            this._ws.onmessage = function(event) {
                try {
                    var data = JSON.parse(event.data);
                    self._handleMessage(data);
                } catch (e) {
                    console.error('WebSocket message parse error:', e);
                }
            };
            
            this._ws.onerror = function(error) {
                console.error('WebSocket error:', error);
            };
            
            this._ws.onclose = function(event) {
                self._stopHeartbeat();
                if (self._isActive) {
                    // Reconnect with exponential backoff
                    self._reconnectTimer = setTimeout(function() {
                        self._connect();
                    }, self._reconnectDelay);
                    self._reconnectDelay = Math.min(self._reconnectDelay * 2, self.MAX_RECONNECT_DELAY);
                }
            };
        } catch (e) {
            console.error('WebSocket connection error:', e);
            if (this._isActive) {
                this._reconnectTimer = setTimeout(function() {
                    self._connect();
                }, this._reconnectDelay);
                this._reconnectDelay = Math.min(this._reconnectDelay * 2, this.MAX_RECONNECT_DELAY);
            }
        }
    },
    /**
     * Send initial data to server when connection is established
     *
     * @private
     */
    _sendInitialData: function() {
        // Subscribe to all channels
        for (var i = 0; i < this._channels.length; i++) {
            this._sendSubscribe(this._channels[i]);
        }
        // Send options
        this._sendOptions();
    },
    /**
     * Send subscribe message for a channel
     *
     * @private
     * @param {string} channel
     */
    _sendSubscribe: function(channel) {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify({
                type: 'subscribe',
                channel: channel
            }));
        }
    },
    /**
     * Send unsubscribe message for a channel
     *
     * @private
     * @param {string} channel
     */
    _sendUnsubscribe: function(channel) {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            this._ws.send(JSON.stringify({
                type: 'unsubscribe',
                channel: channel
            }));
        }
    },
    /**
     * Send options to server
     *
     * @private
     */
    _sendOptions: function() {
        if (this._ws && this._ws.readyState === WebSocket.OPEN) {
            var now = new Date().getTime();
            var options = _.extend({}, this._options, {
                bus_inactivity: now - this._getLastPresence(),
            });
            if (this._lastPartnersPresenceCheck + this.PARTNERS_PRESENCE_CHECK_PERIOD > now) {
                options = _.omit(options, 'bus_presence_partner_ids');
            } else {
                this._lastPartnersPresenceCheck = now;
            }
            this._ws.send(JSON.stringify({
                type: 'options',
                options: options,
                last: this._lastNotificationID
            }));
        }
    },
    /**
     * Start heartbeat to keep connection alive
     *
     * @private
     */
    _startHeartbeat: function() {
        var self = this;
        this._heartbeatTimer = setInterval(function() {
            if (self._ws && self._ws.readyState === WebSocket.OPEN) {
                self._ws.send(JSON.stringify({type: 'ping'}));
            }
        }, this.HEARTBEAT_INTERVAL);
    },
    /**
     * Stop heartbeat timer
     *
     * @private
     */
    _stopHeartbeat: function() {
        if (this._heartbeatTimer) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }
    },
    /**
     * Handle incoming WebSocket messages
     *
     * @private
     * @param {Object} data
     */
    _handleMessage: function(data) {
        if (data.type === 'pong') {
            // Heartbeat response, do nothing
            return;
        } else if (data.type === 'notification') {
            // Handle notifications
            var notifications = data.notifications || [];
            this._onPoll(notifications);
        } else if (data.type === 'error') {
            console.error('WebSocket server error:', data.message);
        }
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------
    /**
     * Handler when the focus of the window change.
     * Trigger the 'window_focus' event.
     *
     * @private
     * @param {Object} params
     * @param {Boolean} params.focus
     */
    _onFocusChange: function (params) {
        this._isOdooFocused = params.focus;
        if (params.focus) {
            this._lastPresenceTime = new Date().getTime();
            this.trigger('window_focus', this._isOdooFocused);
            this._sendOptions();
        }
    },
    /**
     * Handler when the WebSocket receive the new notifications
     * Update the last notification id received.
     * Triggered the 'notification' event with a list [channel, message] from notifications.
     *
     * @private
     * @param {Object[]} notifications, Input notifications have an id, channel, message
     * @returns {Array[]} Output arrays have notification's channel and message
     */
    _onPoll: function (notifications) {
        var self = this;
        var notifs = _.map(notifications, function (notif) {
            if (notif.id > self._lastNotificationID) {
                self._lastNotificationID = notif.id;
            }
            return [notif.channel, notif.message];
        });
        this.trigger("notification", notifs);
        return notifs;
    },
    /**
     * Handler when they are an activity on the window (click, keydown, keyup)
     * Update the last presence date.
     *
     * @private
     */
    _onPresence: function () {
        this._lastPresenceTime = new Date().getTime();
        // Send updated presence periodically
        var now = new Date().getTime();
        if (now - this._lastPartnersPresenceCheck >= this.PARTNERS_PRESENCE_CHECK_PERIOD) {
            this._sendOptions();
        }
    },
});

return WebsocketBus;

});

