# -*- coding: utf-8 -*-

import json
import logging

from odoo import exceptions, _
from odoo.http import Controller, request, route
from odoo.addons.bus.models.bus import dispatch

from odoo.tools import pycompat

_logger = logging.getLogger(__name__)


class BusController(Controller):
    """ Examples:
    openerp.jsonRpc('/longpolling/poll','call',{"channels":["c1"],last:0}).then(function(r){console.log(r)});
    openerp.jsonRpc('/longpolling/send','call',{"channel":"c1","message":"m1"});
    openerp.jsonRpc('/longpolling/send','call',{"channel":"c2","message":"m2"});
    """

    @route('/longpolling/send', type="json", auth="public")
    def send(self, channel, message):
        if not isinstance(channel, pycompat.string_types):
            raise Exception("bus.Bus only string channels are allowed.")
        return request.env['bus.bus'].sendone(channel, message)

    # override to add channels
    def _poll(self, dbname, channels, last, options):
        # update the user presence
        if request.session.uid and 'bus_inactivity' in options:
            request.env['bus.presence'].update(options.get('bus_inactivity'))
        request.cr.close()
        request._cr = None
        return dispatch.poll(dbname, channels, last, options)

    @route('/longpolling/poll', type="json", auth="public")
    def poll(self, channels, last, options=None):
        if options is None:
            options = {}
        if not dispatch:
            raise Exception("bus.Bus unavailable")
        if [c for c in channels if not isinstance(c, pycompat.string_types)]:
            raise Exception("bus.Bus only string channels are allowed.")
        if request.registry.in_test_mode():
            raise exceptions.UserError(_("bus.Bus not available in test mode"))
        return self._poll(request.db, channels, last, options)

    @route('/websocket', type="http", auth="public", cors="*")
    def websocket_handler(self):
        """Handle WebSocket connections"""
        try:
            from geventwebsocket import WebSocketError
            from geventwebsocket.websocket import WebSocket
            from geventwebsocket.handler import WebSocketHandler
        except ImportError:
            _logger.error("gevent-websocket is not installed. Please install it: pip install gevent-websocket")
            return request.make_response("WebSocket not available", status=501)

        ws = request.environ.get('wsgi.websocket')
        if not ws:
            return request.make_response("WebSocket upgrade required", status=426)

        return self._handle_websocket(ws)

    def _handle_websocket(self, ws):
        """Handle WebSocket connection lifecycle"""
        import gevent
        from geventwebsocket import WebSocketError
        import odoo
        from odoo import api

        dbname = request.db
        session_uid = request.session.uid if hasattr(request, 'session') else None
        channels = []
        last_notification_id = 0
        options = {}
        active = True

        def send_message(msg_type, data=None):
            """Send message to WebSocket client"""
            try:
                message = {'type': msg_type}
                if data is not None:
                    message.update(data)
                ws.send(json.dumps(message))
            except WebSocketError:
                return False
            except Exception as e:
                _logger.error("Error sending WebSocket message: %s", e)
                return False
            return True

        def poll_notifications():
            """Poll for notifications and send them to client"""
            nonlocal last_notification_id
            while active:
                try:
                    if channels and dispatch:
                        # Update user presence
                        if session_uid and 'bus_inactivity' in options:
                            try:
                                registry = odoo.registry(dbname)
                                with registry.cursor() as cr:
                                    env = api.Environment(cr, session_uid, {})
                                    env['bus.presence'].update(options.get('bus_inactivity'))
                            except Exception as e:
                                _logger.debug("Error updating presence: %s", e)
                        
                        # Poll for notifications
                        notifications = dispatch.poll(dbname, channels, last_notification_id, options, force_status=False)
                        
                        if notifications:
                            # Update last notification ID
                            for notif in notifications:
                                if notif['id'] > last_notification_id:
                                    last_notification_id = notif['id']
                            
                            # Send notifications to client
                            send_message('notification', {'notifications': notifications})
                    
                    gevent.sleep(0.5)  # Poll every 500ms
                except Exception as e:
                    _logger.error("Error polling notifications: %s", e)
                    gevent.sleep(1)

        # Start polling greenlet
        poll_greenlet = gevent.spawn(poll_notifications)

        try:
            while True:
                try:
                    message = ws.wait()
                    if message is None:
                        break
                    
                    data = json.loads(message)
                    msg_type = data.get('type')
                    
                    if msg_type == 'subscribe':
                        channel = data.get('channel')
                        if channel and channel not in channels:
                            channels.append(channel)
                            _logger.debug("Subscribed to channel: %s", channel)
                    
                    elif msg_type == 'unsubscribe':
                        channel = data.get('channel')
                        if channel in channels:
                            channels.remove(channel)
                            _logger.debug("Unsubscribed from channel: %s", channel)
                    
                    elif msg_type == 'options':
                        options.update(data.get('options', {}))
                        last_notification_id = data.get('last', last_notification_id)
                    
                    elif msg_type == 'ping':
                        send_message('pong')
                    
                except WebSocketError:
                    break
                except ValueError as e:
                    _logger.warning("Invalid JSON received: %s", e)
                    send_message('error', {'message': 'Invalid JSON'})
                except Exception as e:
                    _logger.error("Error handling WebSocket message: %s", e)
                    send_message('error', {'message': str(e)})
        
        except Exception as e:
            _logger.error("WebSocket connection error: %s", e)
        finally:
            active = False
            poll_greenlet.kill()
            try:
                ws.close()
            except:
                pass
        
        return request.make_response("", status=200)
